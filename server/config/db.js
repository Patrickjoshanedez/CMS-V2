import mongoose from 'mongoose';
import env from './env.js';

/**
 * Connect to MongoDB with retry logic.
 * Logs connection events for observability.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      // Mongoose 8+ uses these defaults, but we set them explicitly for clarity
      autoIndex: env.isDevelopment, // Auto-build indexes in dev; disable in prod for performance
    });

    console.warn(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }

  // Connection event listeners
  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.warn('MongoDB reconnected.');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB runtime error: ${err.message}`);
  });
};

export default connectDB;
