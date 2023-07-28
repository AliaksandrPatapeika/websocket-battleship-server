import { httpServer } from './utils';
import { wsApp } from './app';

const HTTP_PORT = 8181;
const WS_PORT = 3000;

try {
  httpServer.listen(HTTP_PORT);
  wsApp(WS_PORT);

  console.log(`Start static HTTP server on port ${HTTP_PORT}!`);
  console.log(`Start WebSocket server on port ${WS_PORT}!`);
} catch (error) {
  console.error('Error starting the servers:', error);
}
