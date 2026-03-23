/**
 * React Query hooks for the Documents module.
 *
 * Provides query hooks and mutation hooks for the manuscript review workflow.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentService } from '../services/documentService';

/* ────────── Query Keys ────────── */

export const documentKeys = {
  all: ['documents'],
  projectManuscripts: (projectId) => [...documentKeys.all, 'project', projectId, 'manuscripts'],
  manuscriptOpenLink: (projectId, documentType) => [
    ...documentKeys.projectManuscripts(projectId),
    'open-link',
    documentType,
  ],
  manuscriptComments: (projectId, documentType) => [
    ...documentKeys.projectManuscripts(projectId),
    'comments',
    documentType,
  ],
};

/* ────────── Query Hooks ────────── */

/**
 * Fetch manuscripts for a specific project.
 */
export function useProjectManuscripts(projectId, options = {}) {
  return useQuery({
    queryKey: documentKeys.projectManuscripts(projectId),
    queryFn: async () => {
      const { data } = await documentService.listProjectManuscripts(projectId);
      return data.data;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch role-based open-link data for a manuscript.
 */
export function useManuscriptOpenLink(projectId, documentType, options = {}) {
  return useQuery({
    queryKey: documentKeys.manuscriptOpenLink(projectId, documentType),
    queryFn: async () => {
      const { data } = await documentService.getOpenLink(projectId, documentType);
      return data.data;
    },
    enabled: !!projectId && !!documentType,
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Fetch archived comments for a manuscript.
 */
export function useArchivedManuscriptComments(projectId, documentType, options = {}) {
  return useQuery({
    queryKey: documentKeys.manuscriptComments(projectId, documentType),
    queryFn: async () => {
      const { data } = await documentService.getArchivedComments(projectId, documentType);
      return data.data;
    },
    enabled: !!projectId && !!documentType,
    staleTime: 60 * 1000,
    ...options,
  });
}

/* ────────── Mutation Hooks ────────── */

function useProjectManuscriptMutation(projectId, mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options;

  return useMutation({
    mutationFn,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.projectManuscripts(projectId) });
      onSuccess?.(...args);
    },
    onError,
    ...restOptions,
  });
}

/** Upload a manuscript with an external document link. */
export function useUploadManuscript(projectId, options = {}) {
  return useProjectManuscriptMutation(
    projectId,
    async ({ documentType, title, externalDocUrl, externalDocProvider = 'google_docs' }) => {
      const payload = {
        documentType,
        externalDocUrl,
        externalDocProvider,
      };
      if (title) {
        payload.title = title;
      }

      const res = await documentService.uploadManuscript(projectId, payload);
      return res.data;
    },
    options,
  );
}

/** Synchronize Drive permissions for a manuscript. */
export function useSyncManuscriptPermissions(projectId, options = {}) {
  return useProjectManuscriptMutation(
    projectId,
    async (documentType) => {
      const res = await documentService.syncPermissions(projectId, documentType);
      return res.data;
    },
    options,
  );
}

/** Submit adviser/instructor review and archive comments. */
export function useSubmitManuscriptReview(projectId, options = {}) {
  return useProjectManuscriptMutation(
    projectId,
    async (documentType) => {
      const res = await documentService.submitReview(projectId, documentType);
      return res.data;
    },
    options,
  );
}

/** Pull latest comments from Drive into archived thread data. */
export function useSyncManuscriptComments(projectId, options = {}) {
  return useProjectManuscriptMutation(
    projectId,
    async (documentType) => {
      const res = await documentService.syncComments(projectId, documentType);
      return res.data;
    },
    options,
  );
}
