import WebSocket from 'ws';
import { WSData } from './types';
import { addShips, addUserToRoom, createRoom, reg } from './handlers';

function wsApp(port: number): void {
  const wss = new WebSocket.Server({ port });
  const init = (): void => {
    wss.on('connection', (ws: WSData): void => {
      ws.on('error', console.error);
      ws.on('message', (payload: WebSocket.RawData): void => {
        const message = JSON.parse(payload.toString());
        const type = message.type;
        const data = message.data.length > 0 ? JSON.parse(message.data) : {};
        console.log(`command: "${type}" result: "${JSON.stringify(data)}"`);

        switch (type) {
          case 'reg': {
            reg(wss, ws, data);
            break;
          }

          case 'create_room': {
            createRoom(wss, ws);
            break;
          }

          case 'add_user_to_room': {
            addUserToRoom(wss, ws, data);
            break;
          }

          case 'add_ships': {
            addShips(ws, data);
            break;
          }
        }
      });
    });
  };

  init();
}

export { wsApp };
