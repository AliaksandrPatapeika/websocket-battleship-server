import WebSocket from 'ws';

export interface WSData extends WebSocket {
  userId: number;
  gameId: number;
}

export type RandomAttack = {
  gameId: number;
  indexPlayer: number;
  isBot: boolean;
};

export type Attack = {
  gameId: number;
  x: number;
  y: number;
  indexPlayer: number;
  isBot: boolean;
};

export type AddShips = {
  gameId: number;
  ships: Ship[];
};

export interface Player {
  ws: WSData;
  userId: number;
  name: string;
  password: string;
  wins: number;
}

export interface Bot {
  name: string;
  password: string;
  readyState: number;
  userId: number;
  gameId: number;
  send: (payload: string) => void;
}

export interface Board {
  isBoardReady: boolean;
  killedCount: number;
  grid: number[][];
  shipsAttack: ShipAttack[];
  ships: Ship[];
}

export interface Game {
  gameId: number;
  players: Player[];
  currentPlayerIndex: number;
  winUserId: number;
  playersBoard: Map<number, Board>;
}

export type ShipType = 'huge' | 'large' | 'medium' | 'small';

export type Ship = {
  position: {
    x: number;
    y: number;
  };
  direction: boolean;
  type: ShipType;
  length: number;
};

export interface ShipAttack {
  length: number;
  x: number[];
  y: number[];
  shots: number;
}
