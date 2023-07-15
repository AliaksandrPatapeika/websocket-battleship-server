import WebSocket from 'ws';
import { Board, Game, Player, WSData } from './types';
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

export { reg, createRoom };
