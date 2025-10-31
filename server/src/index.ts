import { CollabServer } from './server';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

/**
 * Start the collaborative text editor server
 */
const server = new CollabServer(PORT);

// Log server stats every 60 seconds
setInterval(() => {
  const stats = server.getStats();
  console.log(`Server stats - Documents: ${stats.docs}, Clients: ${stats.clients}`);
}, 60000);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  process.exit(0);
});
