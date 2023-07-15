import WebSocket from 'ws';
import { randomInt } from 'node:crypto';

import {
  AddShips,
  Attack,
  Board,
  Game,
  Player,
  RandomAttack,
  ShipAttack,
  WSData,
} from './types';
import {
  convertShipCoordinatesToArray,
  createResponses,
  getSurroundingCoordinates,
  stringifyResp,
} from './utils';

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

const attack = (wss: WebSocket.Server, ws: WSData, data: Attack): void => {
  const { isBot, gameId, indexPlayer, x: positionX, y: positionY } = data;

  // block Players Attack
  if (!(isBot || getGame(gameId).currentPlayerIndex === ws.userId)) {
    return;
  }

  const game = getGame(gameId);
  const { playersBoard } = game;
  const defenderUserId =
    game.players[0].userId === indexPlayer
      ? game.players[1].userId
      : game.players[0].userId;

  const board = playersBoard.get(defenderUserId) as Board;
  let status = 'miss';
  let killedArray: { x: number; y: number }[] = [];
  let missedArray: { x: number; y: number }[] = [];
  let combinedUnavailableCellArray: { x: number; y: number }[] = [];

  if (board.grid[positionX][positionY] !== 0) {
    status = 'unknown';
  } else {
    for (const ship of board.shipsAttack) {
      let result = 'miss';

      if (ship.x.includes(positionX) && ship.y.includes(positionY)) {
        ship.shots += 1;
        result = ship.length === ship.shots ? 'killed' : 'shot';
      }

      if (result === 'killed') {
        killedArray = convertShipCoordinatesToArray(ship);
        missedArray = getSurroundingCoordinates(killedArray);
        combinedUnavailableCellArray = [...killedArray, ...missedArray];
      }

      if (result !== 'miss') {
        status = result;
        board.killedCount += result === 'killed' ? 1 : 0;
        break;
      }
    }

    if (combinedUnavailableCellArray.length) {
      combinedUnavailableCellArray.forEach((cell: { x: number; y: number }) => {
        const { x, y } = cell;
        board.grid[x][y] = 1;
      });
    } else {
      board.grid[positionX][positionY] = 1;
    }
  }

  if (status === 'unknown') {
    return;
  }

  let isGameOver: boolean = false;

  for (const [userId, board] of playersBoard.entries()) {
    if (board.killedCount === 10) {
      if (game.players.length === 2) {
        const winPlayer =
          game.players[0].userId === userId ? game.players[1] : game.players[0];
        winPlayer.wins += 1;
        game.winUserId = winPlayer.userId;
      }

      isGameOver = true;
    }
  }

  if (isGameOver) {
    try {
      const game = getGame(gameId);

      game.players.forEach((player) => {
        player.ws.send(stringifyResp('finish', { winPlayer: game.winUserId }));
      });

      delete games[gameId];
    } finally {
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
          roomUsers: players.map(({ name, userId }) => ({
            name,
            index: userId,
          })),
        })),
      );
    }

    return;
  }
  const clients = game.players.map((player) => player.ws);

  if (status === 'miss') {
    game.currentPlayerIndex =
      game.players[0].userId === game.currentPlayerIndex
        ? game.players[1].userId
        : game.players[0].userId;
  }

  const nextUserId = game.currentPlayerIndex;

  if (status === 'killed') {
    const killResponses = createResponses(indexPlayer, status, killedArray);
    const missResponses = createResponses(indexPlayer, 'miss', missedArray);
    const combinedResponses = [...killResponses, ...missResponses];

    combinedResponses.forEach((response) => {
      clients.forEach((ws) => {
        ws.send(response);
      });
    });
  } else {
    const otherAttackResponse = stringifyResp('attack', {
      position: {
        x: positionX,
        y: positionY,
      },
      currentPlayer: indexPlayer,
      status,
    });

    clients.forEach((ws) => {
      ws.send(otherAttackResponse);
    });
  }

  const turnResponse = stringifyResp('turn', {
    currentPlayer: nextUserId,
  });

  clients.forEach((ws) => {
    ws.send(turnResponse);
  });
};

const randomAttack = (
  wss: WebSocket.Server,
  ws: WSData,
  data: RandomAttack,
): void => {
  const { isBot, gameId, indexPlayer } = data;
  const game = getGame(gameId);

  const defenderUserId =
    game.players[0].userId === game.currentPlayerIndex
      ? game.players[1].userId
      : game.players[0].userId;

  const board = game.playersBoard.get(defenderUserId) as Board;

  const pull = [];

  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 10; x++) {
      if (board.grid[x][y] !== 1) {
        pull.push({ x, y });
      }
    }
  }

  const { x, y } = pull[randomInt(0, pull.length)] || { x: 0, y: 0 };

  attack(wss, ws, { isBot, gameId, x, y, indexPlayer });
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

export { reg, createRoom, addUserToRoom, addShips, attack, randomAttack };
