import app from './app.js';
import connectDB from './config/db.js';
import env from './config/env.js';

const PORT = env.PORT;

/**
 * Start the server:
 * 1. Connect to MongoDB
 * 2. Listen on the configured port
 */
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`[server] Running in ${env.NODE_ENV} mode on port ${PORT}`);
      console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
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
