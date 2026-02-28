/**
 * useNotifications — React Query hooks for the notification module.
 *
 * Provides hooks for fetching notifications (with polling), marking as read,
 * marking all as read, deleting, and clearing all notifications.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/authService';

/** Query key factory for cache management. */
export const notificationKeys = {
  all: ['notifications'],
  list: (params) => ['notifications', 'list', params],
  unreadCount: ['notifications', 'unreadCount'],
};

/**
 * Fetch paginated notifications with unread count.
 * Polls every 30 seconds for real-time updates.
 * @param {Object} params - { page, limit }
 */
export function useNotifications(params = { page: 1, limit: 20 }) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const res = await notificationService.getNotifications(params);
      return res.data.data;
    },
    refetchInterval: 30000, // Poll every 30s
    staleTime: 10000,
    keepPreviousData: true,
  });
}

/**
 * Lightweight hook for just the unread count (used in Header bell badge).
 * Shares the same endpoint but only extracts unreadCount.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      const res = await notificationService.getNotifications({ page: 1, limit: 1 });
      return res.data.data.unreadCount || 0;
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });
}

/** Mark a single notification as read. */
export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

/** Mark all notifications as read. */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

/** Delete a single notification. */
export function useDeleteNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => notificationService.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

/** Clear all notifications for the current user. */
export function useClearAllNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.clearAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}
