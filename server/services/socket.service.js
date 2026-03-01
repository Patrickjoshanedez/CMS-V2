/* eslint-disable no-console */
/**
 * Socket.IO Service — Real-time notification delivery.
 *
 * Provides a singleton Socket.IO server instance that authenticates connections
 * via JWT (same token used for HTTP-only cookies) and organises each user
 * into a private room (`user:<userId>`).
 *
 * Other modules emit real-time events by calling `emitToUser(userId, event, data)`.
 *
 * @module services/socket.service
 */
import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/generateToken.js';
import User from '../modules/users/user.model.js';
import env from '../config/env.js';

/** @type {Server|null} Singleton Socket.IO server instance. */
let io = null;

/**
 * Initialize Socket.IO on the given HTTP server.
 *
 * @param {import('http').Server} httpServer - Node HTTP server instance
 * @returns {Server} The Socket.IO server
 */
export function initializeSocket(httpServer) {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
    // Clients will send the JWT in the auth handshake
    // e.g. io({ auth: { token: '...' } }) or via cookie extraction
  });

  // ─────────── Authentication Middleware ───────────
  io.use(async (socket, next) => {
    try {
      // Try auth.token first, then fall back to cookie extraction
      let token = socket.handshake.auth?.token;

      if (!token) {
        // Extract accessToken from the cookie header
        const cookieHeader = socket.handshake.headers?.cookie;
        if (cookieHeader) {
          const match = cookieHeader.match(/accessToken=([^;]+)/);
          if (match) token = match[1];
        }
      }

      if (!token) {
        return next(new Error('Authentication required.'));
      }

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).select('_id role isActive isVerified');

      if (!user || !user.isActive || !user.isVerified) {
        return next(new Error('Invalid or deactivated account.'));
      }

      // Attach user info to the socket for downstream use
      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch (err) {
      console.error('[Socket] Auth error:', err.message);
      next(new Error('Authentication failed.'));
    }
  });

  // ─────────── Connection Handler ───────────
  io.on('connection', (socket) => {
    const { userId } = socket;
    console.log(`[Socket] User ${userId} connected (socket ${socket.id})`);

    // Join the user's private room
    socket.join(`user:${userId}`);

    // Handle explicit room join (e.g. after reconnect)
    socket.on('join', () => {
      socket.join(`user:${userId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User ${userId} disconnected: ${reason}`);
    });
  });

  console.log('[Socket] Server initialized.');
  return io;
}

/**
 * Get the singleton Socket.IO server instance.
 * Returns null if not yet initialized (e.g. in tests).
 * @returns {Server|null}
 */
export function getIO() {
  return io;
}

/**
 * Emit an event to a specific user's private room.
 *
 * @param {string} userId - The MongoDB ObjectId (as string) of the target user
 * @param {string} event  - Event name (e.g. 'notification:new')
 * @param {Object} data   - Payload to send
 */
export function emitToUser(userId, event, data) {
  if (!io) return; // Silently skip in test / non-socket environments
  io.to(`user:${userId.toString()}`).emit(event, data);
}

/**
 * Reset the Socket.IO instance (used for testing cleanup).
 */
export function resetSocket() {
  io = null;
}

export default { initializeSocket, getIO, emitToUser, resetSocket };
