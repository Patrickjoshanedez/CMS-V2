process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '16';

/* eslint-disable no-console */
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import { initRedis, closeRedis } from './config/redis.js';
import { closeQueues } from './jobs/queue.js';
import { startPlagiarismWorker, stopPlagiarismWorker } from './jobs/plagiarism.job.js';
import { startEmailWorker, stopEmailWorker } from './jobs/email.job.js';
import {
  startDocumentExtractionWorker,
  stopDocumentExtractionWorker,
} from './jobs/documentExtraction.job.js';
import { initializeSocket } from './services/socket.service.js';
import { verifyEmailTransport } from './modules/notifications/email.service.js';
import mongoose from 'mongoose';
import env from './config/env.js';
import deadlineNotificationService from './modules/settings/deadlineNotification.service.js';
import { setupGracefulShutdown } from './utils/shutdown.js';

const PORT = env.PORT;
let httpServer;
let deadlineTimer = null;

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
    startDocumentExtractionWorker();

    const smtpHealth = await verifyEmailTransport();
    if (smtpHealth.status === 'healthy') {
      console.log(`[server] SMTP health: ${smtpHealth.status} (${smtpHealth.message})`);
    } else {
      console.warn(`[server] SMTP health: ${smtpHealth.status} (${smtpHealth.message})`);
    }

    // Create HTTP server from Express app (required for Socket.IO attachment)
    httpServer = http.createServer(app);

    // Attach Socket.IO for real-time notifications
    const io = initializeSocket(httpServer);

    // Register centralized graceful shutdown handler
    setupGracefulShutdown({
      server: httpServer,
      io,
      closeWorkers: async () => {
        await stopPlagiarismWorker();
        await stopEmailWorker();
        await stopDocumentExtractionWorker();
      },
      closeQueues,
      closeRedis,
      mongooseConnection: mongoose.connection,
      extraCleanup: () => {
        if (deadlineTimer) {
          clearInterval(deadlineTimer);
          deadlineTimer = null;
        }
      },
      timeoutMs: 10000,
    });

    httpServer.listen(PORT, () => {
      console.log(`[server] Running in ${env.NODE_ENV} mode on port ${PORT}`);
      console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
      console.log(`[server] Socket.IO ready for real-time notifications.`);

      // Periodic milestone submission deadline checker (runs every 5 minutes)
      deadlineTimer = setInterval(
        () => {
          deadlineNotificationService.checkAndDispatchDueDeadlines().catch((err) => {
            console.warn('[DeadlineChecker] Periodic check failed:', err.message);
          });
        },
        5 * 60 * 1000,
      );
      deadlineTimer.unref();

      // Initial startup sweep for due deadlines
      deadlineNotificationService.checkAndDispatchDueDeadlines().catch((err) => {
        console.warn('[DeadlineChecker] Initial check failed:', err.message);
      });
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

startServer();
