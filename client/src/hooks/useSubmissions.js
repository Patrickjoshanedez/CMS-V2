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

const isValidProjectId = (projectId) => {
  if (typeof projectId !== 'string') return false;
  const normalized = projectId.trim();
  return normalized.length > 0 && normalized !== 'undefined' && normalized !== 'null';
};

const clampUnitRange = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
};

const toUnitSimilarity = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 1 ? clampUnitRange(parsed / 100) : clampUnitRange(parsed);
};

const toValidSpan = (span = {}) => {
  const start = Number(span?.start ?? span?.start_index);
  const end = Number(span?.end ?? span?.end_index);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }

  return {
    start,
    end,
    length: end - start,
  };
};

const toSourceKey = (match = {}, fallbackIndex = 0) => {
  const metadata =
    match?.source_metadata && typeof match.source_metadata === 'object'
      ? match.source_metadata
      : {};

  const keyCandidate =
    metadata.document_id ||
    match.submissionId ||
    match.id ||
    metadata.title ||
    match.projectTitle ||
    match.title;

  if (typeof keyCandidate === 'string' && keyCandidate.trim()) {
    return keyCandidate.trim();
  }

  if (Number.isFinite(keyCandidate)) {
    return String(keyCandidate);
  }

  return `source-${fallbackIndex}`;
};

const toSourceLabel = (match = {}) => {
  const metadata =
    match?.source_metadata && typeof match.source_metadata === 'object'
      ? match.source_metadata
      : {};

  return (
    metadata.title ||
    match.projectTitle ||
    match.title ||
    metadata.document_id ||
    match.submissionId ||
    'Unknown source'
  );
};

/**
 * Top-10 color palette used for source numbering across report views.
 * Each item includes a hex token plus Tailwind utility classes for UI surfaces.
 */
export const PLAGIARISM_SOURCE_PALETTE = [
  {
    hex: '#DC2626',
    badgeClass: 'border-red-300 bg-red-100 text-red-800',
    dotClass: 'bg-red-500',
    highlightClass: 'bg-red-200 text-red-950',
  },
  {
    hex: '#EA580C',
    badgeClass: 'border-orange-300 bg-orange-100 text-orange-800',
    dotClass: 'bg-orange-500',
    highlightClass: 'bg-orange-200 text-orange-950',
  },
  {
    hex: '#D97706',
    badgeClass: 'border-amber-300 bg-amber-100 text-amber-800',
    dotClass: 'bg-amber-500',
    highlightClass: 'bg-amber-200 text-amber-950',
  },
  {
    hex: '#65A30D',
    badgeClass: 'border-lime-300 bg-lime-100 text-lime-800',
    dotClass: 'bg-lime-500',
    highlightClass: 'bg-lime-200 text-lime-950',
  },
  {
    hex: '#059669',
    badgeClass: 'border-emerald-300 bg-emerald-100 text-emerald-800',
    dotClass: 'bg-emerald-500',
    highlightClass: 'bg-emerald-200 text-emerald-950',
  },
  {
    hex: '#0D9488',
    badgeClass: 'border-teal-300 bg-teal-100 text-teal-800',
    dotClass: 'bg-teal-500',
    highlightClass: 'bg-teal-200 text-teal-950',
  },
  {
    hex: '#0891B2',
    badgeClass: 'border-cyan-300 bg-cyan-100 text-cyan-800',
    dotClass: 'bg-cyan-500',
    highlightClass: 'bg-cyan-200 text-cyan-950',
  },
  {
    hex: '#2563EB',
    badgeClass: 'border-blue-300 bg-blue-100 text-blue-800',
    dotClass: 'bg-blue-500',
    highlightClass: 'bg-blue-200 text-blue-950',
  },
  {
    hex: '#7C3AED',
    badgeClass: 'border-violet-300 bg-violet-100 text-violet-800',
    dotClass: 'bg-violet-500',
    highlightClass: 'bg-violet-200 text-violet-950',
  },
  {
    hex: '#DB2777',
    badgeClass: 'border-pink-300 bg-pink-100 text-pink-800',
    dotClass: 'bg-pink-500',
    highlightClass: 'bg-pink-200 text-pink-950',
  },
];

/**
 * Build deterministic source-number and color assignments for plagiarism matches.
 *
 * @param {Array} matches
 * @param {number} limit
 * @returns {{ sourceMap: Map<string, any>, rankedSources: Array }}
 */
export const buildTopSourceColorMap = (matches = [], limit = 10) => {
  const normalizedMatches = Array.isArray(matches) ? matches : [];
  const aggregate = new Map();

  normalizedMatches.forEach((match, index) => {
    const sourceKey = toSourceKey(match, index);
    const sourceLabel = toSourceLabel(match);

    const spans = Array.isArray(match?.spans)
      ? match.spans.map((span) => toValidSpan(span)).filter(Boolean)
      : [];

    const directSpan = toValidSpan({
      start: match?.start_index,
      end: match?.end_index,
    });

    if (directSpan && spans.length === 0) {
      spans.push(directSpan);
    }

    const spanCoverage = spans.reduce((sum, span) => sum + span.length, 0);
    const similarity = toUnitSimilarity(
      match?.similarity_score ?? match?.similarity ?? match?.matchPercentage,
    );

    if (!aggregate.has(sourceKey)) {
      aggregate.set(sourceKey, {
        sourceKey,
        sourceLabel,
        totalCoverage: 0,
        maxSimilarity: 0,
        mentions: 0,
      });
    }

    const current = aggregate.get(sourceKey);
    current.totalCoverage += spanCoverage;
    current.maxSimilarity = Math.max(current.maxSimilarity, similarity);
    current.mentions += 1;
  });

  const rankedSources = [...aggregate.values()].sort((left, right) => {
    if (right.maxSimilarity !== left.maxSimilarity) {
      return right.maxSimilarity - left.maxSimilarity;
    }
    if (right.totalCoverage !== left.totalCoverage) {
      return right.totalCoverage - left.totalCoverage;
    }
    return right.mentions - left.mentions;
  });

  const topSources = rankedSources.slice(0, Math.max(0, limit));
  const sourceMap = new Map();

  topSources.forEach((source, index) => {
    const palette = PLAGIARISM_SOURCE_PALETTE[index % PLAGIARISM_SOURCE_PALETTE.length];
    sourceMap.set(source.sourceKey, {
      ...source,
      sourceNumber: index + 1,
      colorHex: palette.hex,
      badgeClass: palette.badgeClass,
      dotClass: palette.dotClass,
      highlightClass: palette.highlightClass,
    });
  });

  return {
    sourceMap,
    rankedSources,
  };
};

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
  const { enabled: enabledOption, ...restOptions } = options;

  return useQuery({
    queryKey: submissionKeys.listByProject(projectId, filters),
    queryFn: async () => {
      const { data } = await submissionService.getSubmissionsByProject(projectId, filters);
      return data.data; // { submissions, pagination }
    },
    enabled: isValidProjectId(projectId) && (enabledOption ?? true),
    staleTime: 1 * 60 * 1000, // 1 min
    ...restOptions,
  });
}

/**
 * Fetch all versions (history) of a specific chapter.
 */
export function useChapterHistory(projectId, chapter, options = {}) {
  const { enabled: enabledOption, ...restOptions } = options;

  return useQuery({
    queryKey: submissionKeys.chapterHistory(projectId, chapter),
    queryFn: async () => {
      const { data } = await submissionService.getChapterHistory(projectId, chapter);
      return data.data.submissions;
    },
    enabled: isValidProjectId(projectId) && !!chapter && (enabledOption ?? true),
    staleTime: 2 * 60 * 1000, // 2 min
    ...restOptions,
  });
}

/**
 * Fetch the latest version of a specific chapter.
 */
export function useLatestChapter(projectId, chapter, options = {}) {
  const { enabled: enabledOption, ...restOptions } = options;

  return useQuery({
    queryKey: submissionKeys.latestChapter(projectId, chapter),
    queryFn: async () => {
      const { data } = await submissionService.getLatestChapter(projectId, chapter);
      return data.data.submission;
    },
    enabled: isValidProjectId(projectId) && !!chapter && (enabledOption ?? true),
    staleTime: 2 * 60 * 1000, // 2 min
    ...restOptions,
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
 * Upload a system design document for adviser review (student).
 *
 * Expects { projectId, formData, onUploadProgress? }.
 */
export function useUploadSystemDesign(options = {}) {
  return useSubmissionMutation(async ({ projectId, formData, onUploadProgress }) => {
    const res = await submissionService.uploadSystemDesign(projectId, formData, onUploadProgress);
    return res.data;
  }, options);
}

/**
 * Upload a test results document for adviser review (student).
 *
 * Expects { projectId, formData, onUploadProgress? }.
 */
export function useUploadTestResults(options = {}) {
  return useSubmissionMutation(async ({ projectId, formData, onUploadProgress }) => {
    const res = await submissionService.uploadTestResults(projectId, formData, onUploadProgress);
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
