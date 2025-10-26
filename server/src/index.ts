import { WebSocketServer, WebSocket } from 'ws';

const PORT = 8080;

/**
 * Initialize WebSocket server
 */
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server started on port ${PORT}`);

/**
 * Handle new client connections
 */
wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');

  ws.on('message', (data: Buffer) => {
    console.log('Received:', data.toString());
    // Message handling will be implemented later
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });

  ws.on('error', (error: Error) => {
    console.error('WebSocket error:', error);
  });
});

/**
 * Handle server errors
 */
wss.on('error', (error: Error) => {
  console.error('Server error:', error);
});
