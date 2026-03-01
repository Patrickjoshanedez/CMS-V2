/* eslint-disable no-console */
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initRedis, closeRedis } from './config/redis.js';
import { closeQueues } from './jobs/queue.js';
import { startPlagiarismWorker, stopPlagiarismWorker } from './jobs/plagiarism.job.js';
import { startEmailWorker, stopEmailWorker } from './jobs/email.job.js';
import { initializeSocket } from './services/socket.service.js';
import env from './config/env.js';

const PORT = env.PORT;

/**
 * Start the server:
 * 1. Connect to MongoDB
 * 2. Initialize Redis (optional — graceful failure)
 * 3. Start background workers (BullMQ)
 * 4. Create HTTP server and attach Socket.IO
 * 5. Listen on the configured port
 */
const startServer = async () => {
  try {
    await connectDB();

    // Initialize Redis for job queues (non-blocking — fails gracefully)
    await initRedis();

    // Start BullMQ workers (only if Redis is available)
    startPlagiarismWorker();
    startEmailWorker();

    // Create HTTP server from Express app (required for Socket.IO attachment)
    const httpServer = http.createServer(app);

    // Attach Socket.IO for real-time notifications
    initializeSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`[server] Running in ${env.NODE_ENV} mode on port ${PORT}`);
      console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
      console.log(`[server] Socket.IO ready for real-time notifications.`);
    });
  } catch (error) {
    console.error('[server] Failed to start:', error.message);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled Rejection:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[server] Uncaught Exception:', error);
  process.exit(1);
});

// Graceful shutdown — close workers, queues, and Redis connection
const gracefulShutdown = async (signal) => {
  console.log(`[server] ${signal} received — shutting down gracefully...`);
  await stopPlagiarismWorker();
  await stopEmailWorker();
  await closeQueues();
  await closeRedis();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
