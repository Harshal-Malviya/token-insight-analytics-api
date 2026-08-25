import app from './app';
import { config } from './config/env';

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Token Insight & Analytics API is running`);
  console.log(`🌐 Environment: ${config.nodeEnv}`);
  console.log(`🔌 Port: ${config.port}`);
  console.log(`🤖 AI Provider: ${config.aiProvider}`);
  console.log(`=======================================================`);
});

// Handle graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down server gracefully...');
  server.close(() => {
    console.log('Server closed successfully.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default server;
