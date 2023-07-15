import WebSocket from 'ws';
import { AddShips, Board, Game, Player, ShipAttack, WSData } from './types';
import { stringifyResp } from './utils';

const players: { [key: number]: Player } = {};
const games: { [key: number]: Game } = {};
let initRoomId = 1;

const reg = (
  wss: WebSocket.Server,
  ws: WSData,
  { name, password }: { name: string; password: string },
): void => {
  if (Object.values(players).some((player) => player && player.name === name)) {
    console.log('User with this name already exists.');
    return;
  }

  const userId = Object.keys(players).length + 1;
  const player: Player = {
    ws,
    userId,
    name,
    password,
    wins: 0,
  };

  players[userId] = player;

  ws.userId = userId;
  ws.gameId = 0;

  const response = stringifyResp('reg', {
    name: player.name,
    index: player.userId,
    error: false,
    errorText: '',
  });

  ws.send(response);
  broadcastMessage(
    wss,
    'update_winners',
    Object.values(players).map(({ name, wins }) => ({ name, wins })),
  );
  broadcastMessage(
    wss,
    'update_room',
    Object.values(games).map(({ gameId, players }) => ({
      roomId: gameId,
      roomUsers: players.map(({ name, userId }) => ({ name, index: userId })),
    })),
  );
};

const createRoom = (wss: WebSocket.Server, ws: WSData): void => {
  const player = Object.values(players).find(
    (player) => player && player.userId === ws.userId,
  );

  if (player) {
    const gameId = initRoomId++;

    games[gameId] = {
      gameId,
      players: [player],
      currentPlayerIndex: player.userId,
      winUserId: player.userId,
      playersBoard: new Map(),
    };
    addPlayerEmptyBoard(gameId, player.userId);
    ws.gameId = gameId;

    const response = stringifyResp('create_game', {
      idGame: ws.gameId,
      idPlayer: ws.userId,
    });

    ws.send(response);
    broadcastMessage(
      wss,
      'update_winners',
      Object.values(players).map(({ name, wins }) => ({ name, wins })),
    );
    broadcastMessage(
      wss,
      'update_room',
      Object.values(games).map(({ gameId, players }) => ({
        roomId: gameId,
        roomUsers: players.map(({ name, userId }) => ({ name, index: userId })),
      })),
    );
  }
};

const addUserToRoom = (
  wss: WebSocket.Server,
  ws: WSData,
  data: {
    indexRoom: number;
  },
): void => {
  const gameId = data.indexRoom;
  const { userId } = ws;
  const game = getGame(gameId);

  // already two players in room
  if (game.players.length === 2) {
    return;
  }
  const player = Object.values(players).find(
    (player) => player && player.userId === userId,
  );

  if (player) {
    game.players.push(player);
    addPlayerEmptyBoard(gameId, player.userId);

    ws.gameId = gameId;

    const response = stringifyResp('create_game', {
      idGame: gameId,
      idPlayer: userId,
    });

    ws.send(response);
    broadcastMessage(
      wss,
      'update_winners',
      Object.values(players).map(({ name, wins }) => ({ name, wins })),
    );
    broadcastMessage(
      wss,
      'update_room',
      Object.values(games).map(({ gameId, players }) => ({
        roomId: gameId,
        roomUsers: players.map(({ name, userId }) => ({ name, index: userId })),
      })),
    );
  }
};

const addShips = (ws: WSData, data: AddShips): void => {
  const { ships } = data;
  const { userId, gameId } = ws;
  const board = getGame(gameId).playersBoard.get(userId);

  if (board) {
    board.ships = ships;
    ships.forEach((addShip) => {
      const { length, direction } = addShip;
      const { x, y } = addShip.position;
      const ship: ShipAttack = {
        shots: 0,
        length: length,
        x: [],
        y: [],
      };

      if (direction) {
        ship.x = [x];
        ship.y = Array(length)
          .fill(0)
          .map((value, index) => value + index + y);
      } else {
        ship.y = [y];

        ship.x = Array(length)
          .fill(0)
          .map((value, index) => value + index + x);
      }

      board.shipsAttack.push(ship);
    });

    board.isBoardReady = true;
  }
  if (
    Array.from(getGame(gameId).playersBoard.values()).every(
      (board) => board.isBoardReady,
    )
  ) {
    const game = getGame(gameId);
    const { currentPlayerIndex, players, playersBoard } = game;
    const p1response = {
      type: 'start_game',
      data: JSON.stringify({
        ships: playersBoard.get(players[0].userId)?.ships || [],
        currentPlayerIndex: currentPlayerIndex,
      }),
    };

    const p2response = {
      type: 'start_game',
      data: JSON.stringify({
        ships: playersBoard.get(players[1].userId)?.ships || [],
        currentPlayerIndex: currentPlayerIndex,
      }),
    };

    players[0].ws.send(JSON.stringify(p1response));
    players[1].ws.send(JSON.stringify(p2response));
  }
};

const addPlayerEmptyBoard = (gameId: number, userId: number): void => {
  const board: Board = {
    killedCount: 0,
    grid: [],
    shipsAttack: [],
    ships: [],
    isBoardReady: false,
  };

  for (let i = 0; i < 10; i++) {
    board.grid.push(Array(10).fill(0));
  }

  getGame(gameId).playersBoard.set(userId, board);
};

const getGame = (gameId: number): Game => {
  return games[gameId];
};

const broadcastMessage = (
  wss: WebSocket.Server,
  type: string,
  payload: object,
): void => {
  const message = stringifyResp(type, payload);

  wss.clients.forEach((client) => {
    client.send(message);
  });
};

export { reg, createRoom, addUserToRoom, addShips };
