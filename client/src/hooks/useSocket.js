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
import { projectKeys } from './useProjects';

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
      if (!notification || typeof notification !== 'object') {
        return;
      }

      // Show a toast
      toast(notification.title, {
        description: notification.message,
      });

      // Invalidate notification queries so the list + badge update immediately
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });

      const normalizeProjectId = (value) => {
        if (typeof value === 'string' || typeof value === 'number') {
          return String(value);
        }

        if (
          value &&
          typeof value === 'object' &&
          (typeof value._id === 'string' || typeof value._id === 'number')
        ) {
          return String(value._id);
        }

        return undefined;
      };

      const notificationProjectId = normalizeProjectId(
        notification?.metadata?.projectId ?? notification?.metadata?.project,
      );

      // Primary rule: any project-related notification carrying a project id should refresh project queries.
      if (notificationProjectId) {
        queryClient.invalidateQueries({ queryKey: projectKeys.detail(notificationProjectId) });
        queryClient.invalidateQueries({ queryKey: projectKeys.my() });
        queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
        return;
      }

      if (
        notification?.type === 'panelist_assigned' ||
        notification?.type === 'panelist_removed' ||
        notification?.type === 'title_modification_requested' ||
        notification?.type === 'title_modification_resolved'
      ) {
        queryClient.invalidateQueries({ queryKey: projectKeys.all });
      }
    };

    /** Handle connection errors (auth failure, server down, etc.) */
    const handleConnectError = (err) => {
      if (err?.message === 'xhr poll error') {
        return;
      }

      console.warn('[Socket] Connection error:', err?.message || 'unknown error');
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
