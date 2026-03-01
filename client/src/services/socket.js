/**
 * Socket.IO client singleton — manages real-time connection to the backend.
 *
 * Auth is handled via HTTP-only cookies (sent automatically with
 * `withCredentials: true`). The Vite dev proxy forwards `/socket.io`
 * to the Express server; in production, same-origin is used.
 *
 * @module services/socket
 */
import { io } from 'socket.io-client';

/** @type {import('socket.io-client').Socket | null} */
let socket = null;

/**
 * Create (or return existing) socket connection.
 * @returns {import('socket.io-client').Socket}
 */
export function connectSocket() {
  if (socket?.connected) return socket;

  // Disconnect stale instance before creating a new one
  if (socket) {
    socket.disconnect();
  }

  socket = io({
    withCredentials: true,
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return socket;
}

/**
 * Disconnect and destroy the current socket instance.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance (may be null).
 * @returns {import('socket.io-client').Socket | null}
 */
export function getSocket() {
  return socket;
}
