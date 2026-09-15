process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '16';

/* eslint-disable no-console */
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initRedis, closeRedis } from './config/redis.js';
import { closeQueues } from './jobs/queue.js';
import { startPlagiarismWorker, stopPlagiarismWorker } from './jobs/plagiarism.job.js';
import { startEmailWorker, stopEmailWorker } from './jobs/email.job.js';
import { initializeSocket } from './services/socket.service.js';
import { verifyEmailTransport } from './modules/notifications/email.service.js';
import mongoose from 'mongoose';
import env from './config/env.js';

const PORT = env.PORT;
let httpServer;
let isShuttingDown = false;

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

    const smtpHealth = await verifyEmailTransport();
    if (smtpHealth.status === 'healthy') {
      console.log(`[server] SMTP health: ${smtpHealth.status} (${smtpHealth.message})`);
    } else {
      console.warn(`[server] SMTP health: ${smtpHealth.status} (${smtpHealth.message})`);
    }

    // Create HTTP server from Express app (required for Socket.IO attachment)
    httpServer = http.createServer(app);

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

// Graceful shutdown — drain HTTP connections, close workers, queues, Redis, and MongoDB
const gracefulShutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[server] ${signal} received — shutting down gracefully...`);

  // Force exit safety timeout (10 seconds)
  const forceExitTimer = setTimeout(() => {
    console.error('[server] Graceful shutdown timeout exceeded (10s) — forcing exit.');
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    // 1. Stop accepting new HTTP connections and drain in-flight requests
    if (httpServer) {
      await new Promise((resolve) => {
        httpServer.close((err) => {
          if (err) {
            console.error('[server] Error closing HTTP server:', err.message);
          } else {
            console.log('[server] HTTP server closed — in-flight requests drained.');
          }
          resolve();
        });
      });
    }

    // 2. Stop background workers
    await stopPlagiarismWorker();
    await stopEmailWorker();

    // 3. Close job queues
    await closeQueues();

    // 4. Close Redis connection
    await closeRedis();

    // 5. Close Mongoose connection cleanly
    if (mongoose.connection && mongoose.connection.readyState !== 0) {
      await mongoose.connection.close(false);
      console.log('[server] MongoDB connection closed.');
    }

    clearTimeout(forceExitTimer);
    console.log('[server] Graceful shutdown completed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('[server] Error during graceful shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
