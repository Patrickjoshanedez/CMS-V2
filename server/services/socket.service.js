/* eslint-disable no-console */
/**
 * Socket.IO Service — Real-time notification and defense room delivery.
 *
 * Provides a singleton Socket.IO server instance configured with:
 *   - Stateless JWT handshake authentication (0ms DB query overhead)
 *   - Redis Pub/Sub adapter for seamless horizontal multi-process scaling
 *   - Defense room subscriptions (join:project, leave:project)
 *   - Direct user notifications (user:<userId>)
 *
 * @module services/socket.service
 */
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { verifyAccessToken } from '../utils/generateToken.js';
import { getRedisClient, getRedisSubClient, isRedisAvailable } from '../config/redis.js';
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

  const serverOptions = {
    cors: {
      origin: env.CORS_ALLOWED_ORIGINS,
      credentials: true,
    },
  };

  // Attach Redis adapter if Redis is available for cross-cluster event fan-out
  if (isRedisAvailable()) {
    const pubClient = getRedisClient();
    const subClient = getRedisSubClient();
    if (pubClient && subClient) {
      serverOptions.adapter = createAdapter(pubClient, subClient);
      console.log('[Socket] Redis Pub/Sub adapter enabled.');
    }
  }

  io = new Server(httpServer, serverOptions);

  // ─────────── Stateless Authentication Middleware ───────────
  io.use((socket, next) => {
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
        return next(new Error('Authentication required: Missing token.'));
      }

      // Stateless token verification: extracts claims directly from JWT without hitting MongoDB
      const decoded = verifyAccessToken(token);
      const resolvedUserId = (decoded.userId || decoded.id || decoded._id)?.toString();

      if (!resolvedUserId) {
        return next(new Error('Authentication failed: Missing userId in token claims.'));
      }

      // Attach user identity and institutional roles directly to socket
      socket.userId = resolvedUserId;
      socket.userRole = decoded.role;
      socket.facultyRole = decoded.facultyRole || null;
      socket.user = {
        _id: socket.userId,
        role: socket.userRole,
        facultyRole: socket.facultyRole,
      };

      next();
    } catch (err) {
      console.error('[Socket] Auth error:', err.message);
      next(new Error('Authentication failed: Invalid or expired token.'));
    }
  });

  // ─────────── Connection Handler ───────────
  io.on('connection', (socket) => {
    const { userId } = socket;
    console.log(`[Socket] User ${userId} connected (socket ${socket.id})`);

    // Join the user's private personal room
    socket.join(`user:${userId}`);

    // Handle explicit user room re-join
    socket.on('join', () => {
      socket.join(`user:${userId}`);
    });

    // Handle capstone defense room subscriptions
    socket.on('join:project', (projectId) => {
      if (!projectId) return;
      const room = `project:${projectId}`;
      socket.join(room);
      socket.emit('joined:project', { projectId, room });
      console.log(`[Socket] User ${userId} joined ${room}`);
    });

    socket.on('leave:project', (projectId) => {
      if (!projectId) return;
      const room = `project:${projectId}`;
      socket.leave(room);
      socket.emit('left:project', { projectId, room });
      console.log(`[Socket] User ${userId} left ${room}`);
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
  if (!io) return;
  io.to(`user:${userId.toString()}`).emit(event, data);
}

/**
 * Emit an event to an arbitrary room (e.g. 'project:<projectId>').
 *
 * @param {string} room  - Room name
 * @param {string} event - Event name
 * @param {Object} data  - Payload to send
 */
export function emitToRoom(room, event, data) {
  if (!io) return;
  io.to(room).emit(event, data);
}

/**
 * Emit an event specifically to all participants in a capstone project room.
 *
 * @param {string} projectId - Project identifier
 * @param {string} event     - Event name (e.g. 'defense:score_updated')
 * @param {Object} data      - Payload to send
 */
export function emitToProject(projectId, event, data) {
  if (!io || !projectId) return;
  io.to(`project:${projectId.toString()}`).emit(event, data);
}

/**
 * Emit an event to all connected clients across all nodes.
 *
 * @param {string} event - Event name
 * @param {Object} data  - Payload to send
 */
export function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

/**
 * Disconnect all active sockets gracefully (used during server shutdown).
 */
export function disconnectSockets() {
  if (io) {
    io.disconnectSockets(true);
  }
}

/**
 * Reset the Socket.IO instance (used for testing cleanup).
 */
export function resetSocket() {
  if (io) {
    try {
      io.close();
    } catch {
      // Ignore
    }
    io = null;
  }
}

export default {
  initializeSocket,
  getIO,
  emitToUser,
  emitToRoom,
  emitToProject,
  emitToAll,
  disconnectSockets,
  resetSocket,
};
