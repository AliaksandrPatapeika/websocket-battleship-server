import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { Ship, ShipAttack, ShipType } from './types';

export const generateEnemyShips = (): Ship[] => {
  const ships: Ship[] = [];
  const shipCounts: { [key: string]: number } = {
    huge: 1,
    large: 2,
    medium: 3,
    small: 4,
  };

  const shipLengths: { [key: string]: number } = {
    huge: 4,
    large: 3,
    medium: 2,
    small: 1,
  };

  const gridLength = 10;
  const grid: boolean[][] = Array(gridLength)
    .fill(null)
    .map(() => Array(gridLength).fill(false));

  function checkShipPlacement(
    x: number,
    y: number,
    direction: boolean,
    length: number,
  ): boolean {
    const startX = direction ? x - 1 : x;
    const startY = direction ? y - 1 : y;
    const endX = direction ? x + 1 : x + length;
    const endY = direction ? y + length : y + 1;

    if (endX >= gridLength || endY >= gridLength) {
      return false; // Ship exceeds the grid boundaries
    }

    for (let i = startY; i <= endY; i++) {
      for (let j = startX; j <= endX; j++) {
        if (!grid[i] || grid[i][j]) {
          return false; // Ship overlaps with another ship
        }
      }
    }

    return true; // Ship can be placed at the given position and direction
  }

  function hasNeighboringShip(x: number, y: number): boolean {
    const startX = x > 0 ? x - 1 : x;
    const startY = y > 0 ? y - 1 : y;
    const endX = x < gridLength - 1 ? x + 1 : x;
    const endY = y < gridLength - 1 ? y + 1 : y;

    for (let i = startY; i <= endY; i++) {
      for (let j = startX; j <= endX; j++) {
        if (grid[i][j]) {
          return true; // There is a neighboring ship
        }
      }
    }

    return false; // There are no neighboring ships
  }

  function markShipCells(
    x: number,
    y: number,
    direction: boolean,
    length: number,
  ): void {
    const endX = direction ? x + 1 : x + length;
    const endY = direction ? y + length : y + 1;

    for (let i = y; i < endY; i++) {
      for (let j = x; j < endX; j++) {
        if (grid[i] && grid[i][j] !== undefined) {
          grid[i][j] = true;
        }
      }
    }
  }

  for (const type in shipCounts) {
    const count: number = shipCounts[type];
    const length: number = shipLengths[type];

    for (let i = 0; i < count; i++) {
      let shipPlaced = false;

      while (!shipPlaced) {
        const x = Math.floor(Math.random() * gridLength);
        const y = Math.floor(Math.random() * gridLength);
        const direction = Math.random() < 0.5;

        if (
          checkShipPlacement(x, y, direction, length) &&
          !hasNeighboringShip(x, y)
        ) {
          ships.push({
            position: { x, y },
            direction,
            type: type as ShipType,
            length,
          });

          markShipCells(x, y, direction, length);
          shipPlaced = true;
        }
      }
    }
  }

  // console.log('SHIPS', ships);
  return ships;
};

export const httpServer = http.createServer((req, res) => {
  const __dirname = path.resolve(path.dirname(''));
  const file_path =
    __dirname + (req.url === '/' ? '/front/index.html' : '/front' + req.url);
  fs.readFile(file_path, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
});

export const getSurroundingCoordinates = (
  shipCoordinates: { x: number; y: number }[],
): { x: number; y: number }[] => {
  const surroundingCoordinates: { x: number; y: number }[] = [];
  const visitedCoordinates = new Set<string>();

  // Iterate over each coordinate of the ship
  for (const { x, y } of shipCoordinates) {
    // Generate coordinates for all neighboring points in a 3x3 grid
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const newX = x + dx;
        const newY = y + dy;
        const coordinateString = `${newX},${newY}`;

        // Exclude the coordinate if it is part of the original ship or if it is out of bounds
        if (
          !shipCoordinates.some(
            (coordinate) => coordinate.x === newX && coordinate.y === newY,
          ) &&
          newX >= 0 &&
          newX <= 9 && // Check if newX is within the range of 0-9
          newY >= 0 &&
          newY <= 9 && // Check if newY is within the range of 0-9
          !visitedCoordinates.has(coordinateString)
        ) {
          surroundingCoordinates.push({ x: newX, y: newY });
          visitedCoordinates.add(coordinateString);
        }
      }
    }
  }

  return surroundingCoordinates;
};

export const convertShipCoordinatesToArray = (
  ship: ShipAttack,
): { x: number; y: number }[] => {
  const shipArray: { x: number; y: number }[] = [];

  // Check if the ship is horizontal (positionX and positionY have the same length)
  if (ship.x.length === ship.y.length) {
    // Iterate over the positionX and positionY arrays simultaneously
    for (let i = 0; i < ship.x.length; i++) {
      const x = ship.x[i];
      const y = ship.y[i];

      // Check if the coordinates are within the grid boundaries
      if (x >= 0 && x <= 9 && y >= 0 && y <= 9) {
        shipArray.push({ x, y });
      }
    }
  } else {
    // If the ship is vertical, determine the minimum and maximum values for x and y
    const minX = Math.min(...ship.x);
    const minY = Math.min(...ship.y);

    const maxX = Math.max(...ship.x);
    const maxY = Math.max(...ship.y);

    // Generate coordinates for each point within the boundaries defined by minX, minY, maxX, and maxY
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        // Check if the coordinates are within the grid boundaries
        if (x >= 0 && x <= 9 && y >= 0 && y <= 9) {
          shipArray.push({ x, y });
        }
      }
    }
  }

  return shipArray;
};

export const stringifyResp = (type: string, data: object): string => {
  return JSON.stringify({ type, data: JSON.stringify(data) });
};

export const createResponses = (
  indexPlayer: number,
  status: string,
  coordinateArray: { x: number; y: number }[],
): string[] => {
  return coordinateArray.map((coordinate) => {
    return stringifyResp('attack', {
      position: {
        x: coordinate.x,
        y: coordinate.y,
      },
      currentPlayer: indexPlayer,
      status,
    });
  });
};
