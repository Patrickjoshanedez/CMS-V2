/**
 * useNotifications — React Query hooks for the notification module.
 *
 * Provides hooks for fetching notifications (with polling), marking as read,
 * marking all as read, deleting, and clearing all notifications.
 */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notificationService } from '../services/authService';
import { useAuthStore } from '@/stores/authStore';

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
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const res = await notificationService.getNotifications(params);
      const data = res.data.data;
      if (typeof data?.unreadCount === 'number') {
        queryClient.setQueryData(notificationKeys.unreadCount, data.unreadCount);
      }
      return data;
    },
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      if (status === 401 || status === 429) return false;
      return failureCount < 2;
    },
    refetchInterval: 120000, // Fallback poll every 2m (real-time via Socket.IO handles instant updates)
    staleTime: 30000,
    placeholderData: keepPreviousData,
  });
}

/**
 * Lightweight hook for just the unread count (used in Header bell badge).
 * Shares the same endpoint but only extracts unreadCount.
 */
export function useUnreadCount() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      const res = await notificationService.getNotifications({ page: 1, limit: 1 });
      return res.data.data.unreadCount || 0;
    },
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      const status = error?.response?.status;
      if (status === 401 || status === 429) return false;
      return failureCount < 2;
    },
    refetchInterval: 120000,
    staleTime: 30000,
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
    onError: () => {
      toast.error('Failed to mark notification as read');
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
    onError: () => {
      toast.error('Failed to mark all notifications as read');
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
    onError: () => {
      toast.error('Failed to delete notification');
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
    onError: () => {
      toast.error('Failed to clear notifications');
    },
  });
}
