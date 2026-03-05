/**
 * React Query hooks for the Users module (Instructor-only).
 *
 * Provides query hooks (data fetching) and mutation hooks (write actions)
 * for user management: listing, creating, updating, role changes, and deactivation.
 */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { userService } from '../services/authService';

/* ────────── Query Keys ────────── */

export const userKeys = {
  all: ['users'],
  lists: () => [...userKeys.all, 'list'],
  list: (filters) => [...userKeys.lists(), filters],
};

/* ────────── Query Hooks ────────── */

/**
 * Fetch paginated/filtered user list (Instructor-only).
 * @param {Object} filters - { page, limit, role, search, isActive }
 * @param {Object} options - React Query options
 */
export function useUsers(filters = {}, options = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () => {
      const { data } = await userService.listUsers(filters);
      return data.data; // { users, pagination }
    },
    placeholderData: keepPreviousData,
    staleTime: 1 * 60 * 1000, // 1 min
    ...options,
  });
}

/* ────────── Mutation Helper ────────── */

/**
 * Generic user mutation with automatic cache invalidation.
 * After any user write, invalidate all user-related queries.
 */
function useUserMutation(mutationFn, userOptions = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      userOptions.onSuccess?.(...args);
    },
    onError: userOptions.onError,
  });
}

/* ────────── Mutation Hooks ────────── */

/**
 * Create a new user (Instructor-only).
 */
export function useCreateUser(options = {}) {
  return useUserMutation((data) => userService.createUser(data), options);
}

/**
 * Update a user's profile fields (Instructor-only).
 */
export function useUpdateUser(options = {}) {
  return useUserMutation(({ id, data }) => userService.updateUser(id, data), options);
}

/**
 * Change a user's role (Instructor-only).
 */
export function useChangeRole(options = {}) {
  return useUserMutation(({ id, role }) => userService.changeRole(id, { role }), options);
}

/**
 * Soft-delete (deactivate) a user (Instructor-only).
 */
export function useDeleteUser(options = {}) {
  return useUserMutation((id) => userService.deleteUser(id), options);
}
