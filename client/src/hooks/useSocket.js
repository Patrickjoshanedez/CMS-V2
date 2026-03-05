/**
 * useSocket — manages the Socket.IO lifecycle for real-time notifications.
 *
 * Connects when the user is authenticated, disconnects on logout.
 * Listens for `notification:new` events and:
 *   1. Shows a toast via sonner
 *   2. Invalidates React Query notification caches for instant UI update
 *
 * Place this hook in DashboardLayout so it runs for all authenticated pages.
 *
 * @module hooks/useSocket
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { connectSocket, disconnectSocket } from '../services/socket';
import { useAuthStore } from '../stores/authStore';
import { notificationKeys } from './useNotifications';

/**
 * Connects to Socket.IO when authenticated, listens for real-time notifications.
 * @returns {import('socket.io-client').Socket | null}
 */
export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      disconnectSocket();
      socketRef.current = null;
      return;
    }

    const socket = connectSocket();
    socketRef.current = socket;

    /** Handle incoming real-time notifications */
    const handleNotification = (notification) => {
      // Show a toast
      toast(notification.title, {
        description: notification.message,
      });

      // Invalidate notification queries so the list + badge update immediately
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    };

    /** Handle connection errors (auth failure, server down, etc.) */
    const handleConnectError = (err) => {
      console.error('[Socket] Connection error:', err.message);
    };

    /** Handle exhausted reconnection attempts */
    const handleReconnectFailed = () => {
      toast.error('Real-time connection lost', {
        description: 'Live updates are unavailable. Please refresh the page.',
        duration: Infinity,
        id: 'socket-reconnect-failed',
      });
    };

    /** Dismiss any error toast when connection is restored */
    const handleReconnect = () => {
      toast.dismiss('socket-reconnect-failed');
    };

    socket.on('notification:new', handleNotification);
    socket.on('connect_error', handleConnectError);
    socket.io.on('reconnect_failed', handleReconnectFailed);
    socket.io.on('reconnect', handleReconnect);

    // Cleanup: remove the listeners (but keep the connection for other hooks)
    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('connect_error', handleConnectError);
      socket.io.off('reconnect_failed', handleReconnectFailed);
      socket.io.off('reconnect', handleReconnect);
    };
  }, [isAuthenticated, queryClient]);

  return socketRef.current;
}
