/**
 * React Query hooks for the Submissions module.
 *
 * Provides query hooks (data fetching) and mutation hooks (write actions)
 * for chapter uploads, review workflow, lock/unlock, annotations,
 * and pre-signed view URLs.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submissionService } from '../services/submissionService';
import { plagiarismService } from '../services/plagiarismService';
import { projectKeys } from './useProjects';

/* ────────── Query Keys ────────── */

export const submissionKeys = {
  all: ['submissions'],
  lists: () => [...submissionKeys.all, 'list'],
  listByProject: (projectId, filters) => [...submissionKeys.lists(), projectId, filters],
  details: () => [...submissionKeys.all, 'detail'],
  detail: (id) => [...submissionKeys.details(), id],
  chapterHistories: () => [...submissionKeys.all, 'chapterHistory'],
  chapterHistory: (projectId, chapter) => [
    ...submissionKeys.chapterHistories(),
    projectId,
    chapter,
  ],
  latestChapters: () => [...submissionKeys.all, 'latestChapter'],
  latestChapter: (projectId, chapter) => [...submissionKeys.latestChapters(), projectId, chapter],
  viewUrls: () => [...submissionKeys.all, 'viewUrl'],
  viewUrl: (id) => [...submissionKeys.viewUrls(), id],
  googleDocComments: (id) => [...submissionKeys.all, 'googleDocComments', id],
  plagiarismReports: () => [...submissionKeys.all, 'plagiarismReport'],
  plagiarismReport: (id) => [...submissionKeys.plagiarismReports(), id],
  reviewWorkspace: (id) => [...submissionKeys.all, 'reviewWorkspace', id],
};

/* ────────── Query Hooks ────────── */

/**
 * Fetch the full PlagiarismReport for a submission.
 *
 * Only enabled once the plagiarism check status is "completed"; callers should
 * guard with `enabled: plagiarismStatus === 'completed'` via the Options prop.
 *
 * @param {string|null} submissionId
 * @param {import('@tanstack/react-query').UseQueryOptions} options
 * @returns Query result containing `{ submissionId, originalityScore, extractedText,
 *   fullReport, matchedSources, processedAt }`
 */
export function usePlagiarismReport(submissionId, options = {}) {
  return useQuery({
    queryKey: submissionKeys.plagiarismReport(submissionId),
    queryFn: async () => {
      const { data } = await plagiarismService.getPlagiarismReport(submissionId);
      return data.data;
    },
    enabled: !!submissionId,
    staleTime: 5 * 60 * 1000, // 5 min — report is immutable once completed
    ...options,
  });
}

/**
 * Fetch a single submission by ID.
 */
export function useSubmission(submissionId, options = {}) {
  return useQuery({
    queryKey: submissionKeys.detail(submissionId),
    queryFn: async () => {
      const { data } = await submissionService.getSubmission(submissionId);
      return data.data.submission;
    },
    enabled: !!submissionId,
    staleTime: 2 * 60 * 1000, // 2 min
    ...options,
  });
}

/**
 * Fetch paginated/filtered submissions for a project.
 */
export function useProjectSubmissions(projectId, filters = {}, options = {}) {
  return useQuery({
    queryKey: submissionKeys.listByProject(projectId, filters),
    queryFn: async () => {
      const { data } = await submissionService.getSubmissionsByProject(projectId, filters);
      return data.data; // { submissions, pagination }
    },
    enabled: !!projectId,
    staleTime: 1 * 60 * 1000, // 1 min
    ...options,
  });
}

/**
 * Fetch all versions (history) of a specific chapter.
 */
export function useChapterHistory(projectId, chapter, options = {}) {
  return useQuery({
    queryKey: submissionKeys.chapterHistory(projectId, chapter),
    queryFn: async () => {
      const { data } = await submissionService.getChapterHistory(projectId, chapter);
      return data.data.submissions;
    },
    enabled: !!projectId && !!chapter,
    staleTime: 2 * 60 * 1000, // 2 min
    ...options,
  });
}

/**
 * Fetch the latest version of a specific chapter.
 */
export function useLatestChapter(projectId, chapter, options = {}) {
  return useQuery({
    queryKey: submissionKeys.latestChapter(projectId, chapter),
    queryFn: async () => {
      const { data } = await submissionService.getLatestChapter(projectId, chapter);
      return data.data.submission;
    },
    enabled: !!projectId && !!chapter,
    staleTime: 2 * 60 * 1000, // 2 min
    ...options,
  });
}

/**
 * Fetch a time-limited pre-signed URL to view a submission document.
 */
export function useViewUrl(submissionId, options = {}) {
  return useQuery({
    queryKey: submissionKeys.viewUrl(submissionId),
    queryFn: async () => {
      const { data } = await submissionService.getViewUrl(submissionId);
      return data.data; // { url, expiresIn }
    },
    enabled: !!submissionId,
    staleTime: 55 * 60 * 1000, // 55 min — keeps cache fresh before 1h signed URL expiry
    ...options,
  });
}

/**
 * Fetch Google Docs comments/replies for a submission's synced Google Doc.
 */
export function useGoogleDocComments(submissionId, options = {}) {
  return useQuery({
    queryKey: submissionKeys.googleDocComments(submissionId),
    queryFn: async () => {
      const { data } = await submissionService.getGoogleDocComments(submissionId);
      return data.data;
    },
    enabled: !!submissionId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    ...options,
  });
}

/**
 * Fetch split-view review workspace for a submission thread.
 */
export function useSubmissionReviewWorkspace(submissionId, options = {}) {
  return useQuery({
    queryKey: submissionKeys.reviewWorkspace(submissionId),
    queryFn: async () => {
      const { data } = await submissionService.getReviewWorkspace(submissionId);
      return data.data.workspace;
    },
    enabled: !!submissionId,
    staleTime: 60 * 1000,
    ...options,
  });
}

/* ────────── Mutation Helper ────────── */

/**
 * Shared mutation wrapper that invalidates all submission queries
 * and optionally the parent project queries on success.
 */
function useSubmissionMutation(mutationFn, options = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, ...restOptions } = options;
  return useMutation({
    mutationFn,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all });
      // Also refresh the project data (phase status may change)
      queryClient.invalidateQueries({ queryKey: projectKeys.all });
      onSuccess?.(...args);
    },
    onError,
    ...restOptions,
  });
}

/* ────────── Mutation Hooks ────────── */

/**
 * Upload a chapter document (student).
 *
 * Expects { projectId, formData, onUploadProgress? }.
 * formData must include 'file' (File), 'chapter' (number), and optionally 'remarks'.
 */
export function useUploadChapter(options = {}) {
  return useSubmissionMutation(async ({ projectId, formData, onUploadProgress }) => {
    const res = await submissionService.uploadChapter(projectId, formData, onUploadProgress);
    return res.data;
  }, options);
}

/**
 * Review a submission (adviser / instructor).
 *
 * Expects { submissionId, status, reviewNote? }.
 */
export function useReviewSubmission(options = {}) {
  return useSubmissionMutation(async ({ submissionId, ...data }) => {
    const res = await submissionService.reviewSubmission(submissionId, data);
    return res.data;
  }, options);
}

/**
 * Unlock a locked submission (adviser / instructor).
 *
 * Expects { submissionId, reason }.
 */
export function useUnlockSubmission(options = {}) {
  return useSubmissionMutation(async ({ submissionId, ...data }) => {
    const res = await submissionService.unlockSubmission(submissionId, data);
    return res.data;
  }, options);
}

/**
 * Add an annotation / highlight on a submission (adviser / instructor / panelist).
 *
 * Expects { submissionId, content, page?, highlightCoords? }.
 */
export function useAddAnnotation(options = {}) {
  return useSubmissionMutation(async ({ submissionId, ...data }) => {
    const res = await submissionService.addAnnotation(submissionId, data);
    return res.data;
  }, options);
}

/**
 * Remove an annotation (author or instructor).
 *
 * Expects { submissionId, annotationId }.
 */
export function useRemoveAnnotation(options = {}) {
  return useSubmissionMutation(async ({ submissionId, annotationId }) => {
    const res = await submissionService.removeAnnotation(submissionId, annotationId);
    return res.data;
  }, options);
}

/**
 * Add a threaded reply to an annotation.
 */
export function useAddAnnotationReply(options = {}) {
  return useSubmissionMutation(async ({ submissionId, annotationId, ...data }) => {
    const res = await submissionService.addAnnotationReply(submissionId, annotationId, data);
    return res.data;
  }, options);
}

/**
 * Request another revision round.
 */
export function useRequestRevisionRound(options = {}) {
  return useSubmissionMutation(async ({ submissionId, ...data }) => {
    const res = await submissionService.requestRevisionRound(submissionId, data);
    return res.data;
  }, options);
}

/**
 * Mark submission accepted and close review thread.
 */
export function useMarkSubmissionAccepted(options = {}) {
  return useSubmissionMutation(async ({ submissionId, ...data }) => {
    const res = await submissionService.markAccepted(submissionId, data);
    return res.data;
  }, options);
}

/**
 * Compile and upload the full proposal document (student).
 *
 * Expects { projectId, formData, onUploadProgress? }.
 * formData must include 'file' (File) and optionally 'remarks'.
 * Requires chapters 1-3 to be locked/approved.
 */
export function useCompileProposal(options = {}) {
  return useSubmissionMutation(async ({ projectId, formData, onUploadProgress }) => {
    const res = await submissionService.compileProposal(projectId, formData, onUploadProgress);
    return res.data;
  }, options);
}

/**
 * Upload the full academic version for Capstone 4 (student).
 *
 * Expects { projectId, formData, onUploadProgress? }.
 */
export function useUploadFinalAcademic(options = {}) {
  return useSubmissionMutation(async ({ projectId, formData, onUploadProgress }) => {
    const res = await submissionService.uploadFinalAcademic(projectId, formData, onUploadProgress);
    return res.data;
  }, options);
}

/**
 * Upload the journal/publishable version for Capstone 4 (student).
 *
 * Expects { projectId, formData, onUploadProgress? }.
 */
export function useUploadFinalJournal(options = {}) {
  return useSubmissionMutation(async ({ projectId, formData, onUploadProgress }) => {
    const res = await submissionService.uploadFinalJournal(projectId, formData, onUploadProgress);
    return res.data;
  }, options);
}
