/**
 * useProjectRealtime — Unified WebSocket synchronization hook for capstone workspaces.
 *
 * Joins the real-time project room (`project:<projectId>`), listens for live rubric scoring,
 * defense minutes, ADM updates, and submission progression events, and reconciles the
 * local TanStack Query cache automatically with 0ms DOM re-renders and zero browser reloads.
 *
 * @module hooks/useProjectRealtime
 */
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, getSocket } from '../services/socket';
import { evaluationKeys } from './useEvaluations';
import { projectKeys } from './useProjects';

/**
 * Hook to synchronize a project's state in real time.
 *
 * @param {string} projectId - The active project ID
 * @returns {{ isConnected: boolean, socket: import('socket.io-client').Socket | null }}
 */
export function useProjectRealtime(projectId) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    const socket = connectSocket();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('join:project', projectId);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // If already connected, join immediately
    if (socket.connected) {
      setIsConnected(true);
      socket.emit('join:project', projectId);
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // ─── Real-Time Domain Event Handlers ───

    // 1. Live Rubric Score Updates (Defense Panelists scoring)
    const handleScoreUpdated = (payload) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    };

    // 2. Defense Scores Released (Instructor opens grades to students)
    const handleScoresReleased = (payload) => {
      queryClient.invalidateQueries({ queryKey: evaluationKeys.all });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    };

    // 3. Defense Minutes & Remarks (Secretary logging Form OVPAA-F-INS-032)
    const handleMinutesUpdated = (payload) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: ['defense-minutes', projectId] });
      queryClient.invalidateQueries({ queryKey: ['adm', projectId] });
    };

    // 4. Action Done Matrix (ADM) Sync & Signatures
    const handleAdmUpdated = (payload) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: ['adm', projectId] });
    };

    // 5. Project Metadata or Phase Changes
    const handleProjectUpdated = (payload) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    };

    // 6. Chapter Submission Status Updates
    const handleSubmissionUpdated = (payload) => {
      queryClient.invalidateQueries({ queryKey: ['submissions', projectId] });
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    };

    socket.on('defense:score_updated', handleScoreUpdated);
    socket.on('defense:scores_released', handleScoresReleased);
    socket.on('defense:minutes_updated', handleMinutesUpdated);
    socket.on('adm:updated', handleAdmUpdated);
    socket.on('project:updated', handleProjectUpdated);
    socket.on('submission:status_updated', handleSubmissionUpdated);

    return () => {
      socket.emit('leave:project', projectId);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('defense:score_updated', handleScoreUpdated);
      socket.off('defense:scores_released', handleScoresReleased);
      socket.off('defense:minutes_updated', handleMinutesUpdated);
      socket.off('adm:updated', handleAdmUpdated);
      socket.off('project:updated', handleProjectUpdated);
      socket.off('submission:status_updated', handleSubmissionUpdated);
    };
  }, [projectId, queryClient]);

  return { isConnected, socket: getSocket() };
}

export default useProjectRealtime;
