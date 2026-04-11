import api from './api';

const normalizeProjectId = (projectId) => {
  if (typeof projectId !== 'string') return '';
  return projectId.trim();
};

const assertProjectId = (projectId, operation) => {
  const normalized = normalizeProjectId(projectId);
  if (!normalized || normalized === 'undefined' || normalized === 'null') {
    throw new Error(`Invalid project id for ${operation}.`);
  }

  return normalized;
};

/**
 * Submission API service — all submission-related HTTP calls.
 *
 * Covers: chapter upload, read/list, review workflow, lock/unlock,
 * annotations, pre-signed view URLs, and chapter history.
 */
export const submissionService = {
  /* ────── Student: upload ────── */

  /**
   * Upload a chapter document.
   * Sends as multipart/form-data (file + JSON fields).
   *
   * @param {string} projectId
   * @param {FormData} formData - Must contain 'file', 'chapter', and optionally 'remarks'
   * @param {Function} [onUploadProgress] - Axios progress callback
   */
  uploadChapter: (projectId, formData, onUploadProgress) =>
    api.post(`/submissions/${assertProjectId(projectId, 'uploadChapter')}/chapters`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min for large file uploads
      onUploadProgress,
    }),

  /* ────── Read ────── */

  /** Get a single submission by ID */
  getSubmission: (submissionId) => api.get(`/submissions/${submissionId}`),

  /** List submissions for a project with optional filters & pagination */
  getSubmissionsByProject: (projectId, params) =>
    api.get(`/submissions/project/${assertProjectId(projectId, 'getSubmissionsByProject')}`, {
      params,
    }),

  /** Get version history for a specific chapter */
  getChapterHistory: (projectId, chapter) =>
    api.get(`/submissions/project/${assertProjectId(projectId, 'getChapterHistory')}/chapters/${chapter}`),

  /** Get only the latest version of a specific chapter */
  getLatestChapter: (projectId, chapter) =>
    api.get(
      `/submissions/project/${assertProjectId(projectId, 'getLatestChapter')}/chapters/${chapter}/latest`,
    ),

  /** Get a pre-signed URL to view the document */
  getViewUrl: (submissionId) => api.get(`/submissions/${submissionId}/view`),

  /** Get Google Docs comments/replies for the submission's synced document */
  getGoogleDocComments: (submissionId) => api.get(`/submissions/${submissionId}/google-comments`),

  /* ────── Faculty: review workflow ────── */

  /**
   * Review a submission (approve / request revisions / reject).
   * @param {string} submissionId
   * @param {Object} data - { status: 'approved'|'revisions_required'|'rejected', reviewNote? }
   */
  reviewSubmission: (submissionId, data) => api.post(`/submissions/${submissionId}/review`, data),

  /**
   * Unlock a locked submission so the student can re-upload.
   * @param {string} submissionId
   * @param {Object} data - { reason }
   */
  unlockSubmission: (submissionId, data) => api.post(`/submissions/${submissionId}/unlock`, data),

  /* ────── Faculty: annotations ────── */

  /**
   * Add an annotation (highlight & comment) on a submission.
   * @param {string} submissionId
   * @param {Object} data - { page?, lineStart?, lineEnd?, selectedText?, content, highlightCoords? }
   */
  addAnnotation: (submissionId, data) => api.post(`/submissions/${submissionId}/annotations`, data),

  /**
   * Add a threaded reply to a specific annotation.
   * @param {string} submissionId
   * @param {string} annotationId
   * @param {{content:string}} data
   */
  addAnnotationReply: (submissionId, annotationId, data) =>
    api.post(`/submissions/${submissionId}/annotations/${annotationId}/replies`, data),

  /**
   * Remove an annotation.
   * @param {string} submissionId
   * @param {string} annotationId
   */
  removeAnnotation: (submissionId, annotationId) =>
    api.delete(`/submissions/${submissionId}/annotations/${annotationId}`),

  /* ────── Student: final paper uploads (Capstone 4) ────── */

  /**
   * Upload the full academic version of the final paper.
   * @param {string} projectId
   * @param {FormData} formData - Must contain 'file' and optionally 'remarks'
   * @param {Function} [onUploadProgress]
   */
  uploadFinalAcademic: (projectId, formData, onUploadProgress) =>
    api.post(`/submissions/${assertProjectId(projectId, 'uploadFinalAcademic')}/final-academic`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress,
    }),

  /**
   * Upload the journal/publishable version of the final paper.
   * @param {string} projectId
   * @param {FormData} formData - Must contain 'file' and optionally 'remarks'
   * @param {Function} [onUploadProgress]
   */
  uploadFinalJournal: (projectId, formData, onUploadProgress) =>
    api.post(`/submissions/${assertProjectId(projectId, 'uploadFinalJournal')}/final-journal`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
      onUploadProgress,
    }),

  /* ────── Phase 1: Feedback & Versions ────── */

  /**
   * Get feedback context for a submission.
   * Returns: annotations, timeline, deadline, plagiarism metadata.
   * @param {string} submissionId
   */
  getSubmissionFeedback: (submissionId) => api.get(`/submissions/${submissionId}/feedback`),

  /**
   * Get version history for a submission.
   * Returns: all versions with metadata (date, status, file size, plagiarism score).
   * @param {string} submissionId
   */
  getSubmissionVersions: (submissionId) => api.get(`/submissions/${submissionId}/versions`),

  /**
   * Mark an annotation as resolved (student-addressed).
   * @param {string} submissionId
   * @param {string} annotationId
   */
  markAnnotationResolved: (submissionId, annotationId) =>
    api.post(`/submissions/${submissionId}/annotations/${annotationId}/resolve`),

  /**
   * Get split-view review workspace metadata + rounds.
   * @param {string} submissionId
   */
  getReviewWorkspace: (submissionId) => api.get(`/submissions/${submissionId}/review-workspace`),

  /**
   * Request another revision and open next round for student upload.
   * @param {string} submissionId
   * @param {{overallFeedback?:string}} data
   */
  requestRevisionRound: (submissionId, data) =>
    api.post(`/submissions/${submissionId}/request-revision-round`, data),

  /**
   * Mark submission accepted and close review thread.
   * @param {string} submissionId
   * @param {{overallFeedback?:string}} data
   */
  markAccepted: (submissionId, data) => api.post(`/submissions/${submissionId}/accept`, data),
};
