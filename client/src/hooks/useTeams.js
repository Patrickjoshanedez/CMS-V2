/**
 * React Query hooks for the Teams module.
 *
 * Provides query hooks (data fetching) and mutation hooks (write actions)
 * for team management: creation, member invitations, invite acceptance/decline,
 * and team locking.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamService } from '../services/authService';

/* ────────── Query Keys ────────── */

export const teamKeys = {
  all: ['teams'],
  my: () => [...teamKeys.all, 'my'],
  lists: () => [...teamKeys.all, 'list'],
  list: (filters) => [...teamKeys.lists(), filters],
};

/* ────────── Query Hooks ────────── */

/**
 * Fetch the current student's team (populated leader + members).
 * Returns null when the student has no team (404).
 */
export function useMyTeam(options = {}) {
  return useQuery({
    queryKey: teamKeys.my(),
    queryFn: async () => {
      const { data } = await teamService.getMyTeam();
      return data.data.team;
    },
    retry: (failureCount, error) => {
      // Don't retry on 404 — student simply has no team yet
      if (error?.response?.status === 404) return false;
      return failureCount < 3;
    },
    staleTime: 2 * 60 * 1000, // 2 min
    ...options,
  });
}

/**
 * Fetch paginated/filtered team list (faculty: instructor, adviser, panelist).
 */
export function useTeams(filters = {}, options = {}) {
  return useQuery({
    queryKey: teamKeys.list(filters),
    queryFn: async () => {
      const { data } = await teamService.listTeams(filters);
      return data.data; // { teams, pagination }
    },
    staleTime: 1 * 60 * 1000, // 1 min
    ...options,
  });
}

/* ────────── Mutation Helper ────────── */

/**
 * Generic team mutation with automatic cache invalidation.
 * After any team write, invalidate all team-related queries.
 */
function useTeamMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options;
  return useMutation({
    mutationFn,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all });
      onSuccess?.(...args);
    },
    onError,
    ...restOptions,
  });
}

/* ────────── Mutation Hooks ────────── */

/**
 * Create a new team.
 * @param {Object} data — { name: string, academicYear: string }
 */
export function useCreateTeam(options = {}) {
  return useTeamMutation(async (data) => {
    const res = await teamService.createTeam(data);
    return res.data;
  }, options);
}

/**
 * Invite a member to a team by email.
 * @param {Object} params — { teamId: string, email: string }
 */
export function useInviteMember(options = {}) {
  return useTeamMutation(async ({ teamId, email }) => {
    const res = await teamService.inviteMember(teamId, { email });
    return res.data;
  }, options);
}

/**
 * Accept a team invitation.
 * @param {string} token — The invite token from the email link.
 */
export function useAcceptInvite(options = {}) {
  return useTeamMutation(async (token) => {
    const res = await teamService.acceptInvite(token);
    return res.data;
  }, options);
}

/**
 * Decline a team invitation.
 * @param {string} token — The invite token.
 */
export function useDeclineInvite(options = {}) {
  return useTeamMutation(async (token) => {
    const res = await teamService.declineInvite(token);
    return res.data;
  }, options);
}

/**
 * Lock a team (leader or instructor only).
 * Prevents further member changes.
 * @param {string} teamId
 */
export function useLockTeam(options = {}) {
  return useTeamMutation(async (teamId) => {
    const res = await teamService.lockTeam(teamId);
    return res.data;
  }, options);
}
