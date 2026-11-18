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
import User from '../modules/users/user.model.js';
import Project from '../modules/projects/project.model.js';
import Team from '../modules/teams/team.model.js';
import Section from '../modules/academics/section.model.js';
import { canJoinProjectRoom } from './projectRoomAuthorization.js';

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

  // ─────────── Current-account Authentication Middleware ───────────
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
        return next(new Error('Authentication required: Missing token.'));
      }

      const decoded = verifyAccessToken(token);
      const resolvedUserId = (decoded.userId || decoded.id || decoded._id)?.toString();

      if (!resolvedUserId) {
        return next(new Error('Authentication failed: Missing userId in token claims.'));
      }

      const user = await User.findById(resolvedUserId).select('-password');
      if (!user || !user.isActive || !user.isVerified) {
        return next(new Error('Authentication failed: Account is unavailable.'));
      }
      if ((decoded.sessionVersion ?? -1) !== (user.sessionVersion ?? 0)) {
        return next(new Error('Authentication failed: Session has been invalidated.'));
      }

      // Use current database roles so stale signed claims cannot retain old privileges.
      socket.userId = resolvedUserId;
      socket.user = user;
      socket.userRole = user.role;
      socket.tokenExpiresAt = decoded.exp * 1000;

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

    const expiryTimer = setTimeout(
      () => socket.disconnect(true),
      Math.max(0, socket.tokenExpiresAt - Date.now()),
    );
    expiryTimer.unref?.();
    const accountCheck = setInterval(async () => {
      try {
        const current = await User.findById(userId)
          .select('role isActive isVerified sessionVersion')
          .lean();
        if (
          !current ||
          !current.isActive ||
          !current.isVerified ||
          current.role !== socket.user.role ||
          (current.sessionVersion ?? 0) !== (socket.user.sessionVersion ?? 0)
        ) {
          socket.disconnect(true);
          return;
        }
        for (const room of socket.rooms) {
          if (!room.startsWith('project:')) continue;
          const projectId = room.slice('project:'.length);
          const project = await Project.findById(projectId)
            .select('teamId memberRoleAssignments adviserId secretaryId panelistIds sectionId')
            .lean();
          const team = project?.teamId
            ? await Team.findById(project.teamId)
                .select(
                  'members leaderId adviserId secretaryId panelistIds instructorId sectionInstructorId sectionId',
                )
                .lean()
            : null;
          const leaderId = team?.leaderId?._id || team?.leaderId;
          const leader = leaderId
            ? await User.findById(leaderId).select('instructorId').lean()
            : null;
          const sectionId = project?.sectionId || team?.sectionId;
          const section = sectionId
            ? await Section.findById(sectionId).select('createdBy').lean()
            : null;
          if (!canJoinProjectRoom(current, project, team, leader, section)) socket.leave(room);
        }
      } catch (error) {
        console.warn(`[Socket] Session revalidation failed for ${userId}: ${error.message}`);
        socket.disconnect(true);
      }
    }, 30_000);
    accountCheck.unref?.();

    // Handle explicit user room re-join
    socket.on('join', () => {
      socket.join(`user:${userId}`);
    });

    // Handle private project room subscriptions using canonical current assignments.
    socket.on('join:project', async (projectId) => {
      const deny = () => socket.emit('join:project:denied', { projectId });
      if (!projectId || typeof projectId !== 'string' || !/^[a-f\d]{24}$/i.test(projectId)) {
        deny();
        return;
      }
      try {
        const project = await Project.findById(projectId)
          .select('teamId memberRoleAssignments adviserId secretaryId panelistIds sectionId')
          .lean();
        if (!project) {
          deny();
          return;
        }
        const team = project.teamId
          ? await Team.findById(project.teamId)
              .select(
                'members leaderId adviserId secretaryId panelistIds instructorId sectionInstructorId',
              )
              .lean()
          : null;
        const leaderId = team?.leaderId?._id || team?.leaderId;
        const leader = leaderId
          ? await User.findById(leaderId).select('instructorId').lean()
          : null;
        const currentUser = await User.findById(userId)
          .select('role facultyRole isActive isVerified')
          .lean();
        const sectionId = project.sectionId || team?.sectionId;
        const section = sectionId
          ? await Section.findById(sectionId).select('createdBy').lean()
          : null;
        if (!canJoinProjectRoom(currentUser, project, team, leader, section)) {
          deny();
          return;
        }
        const room = `project:${projectId}`;
        socket.join(room);
        socket.emit('joined:project', { projectId, room });
        console.log(`[Socket] User ${userId} joined ${room}`);
      } catch (err) {
        console.warn(`[Socket] Error authorizing join:project: ${err.message}`);
        deny();
      }
    });

    socket.on('leave:project', (projectId) => {
      if (!projectId) return;
      const room = `project:${projectId}`;
      socket.leave(room);
      socket.emit('left:project', { projectId, room });
      console.log(`[Socket] User ${userId} left ${room}`);
    });

    socket.on('disconnect', (reason) => {
      clearTimeout(expiryTimer);
      clearInterval(accountCheck);
      console.log(`[Socket] User ${userId} disconnected: ${reason}`);
    });
  });

  console.log('[Socket] Server initialized.');
  return io;
}

/** Revoke every live connection for an account across the Socket.IO adapter. */
export function invalidateUserSockets(userId) {
  if (!io || !userId) return;
  io.in(`user:${userId.toString()}`).disconnectSockets(true);
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
export async function resetSocket() {
  if (io) {
    const current = io;
    io = null;
    await new Promise((resolve) => current.close(resolve));
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
  invalidateUserSockets,
  resetSocket,
};
