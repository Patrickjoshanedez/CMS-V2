import api from './api';

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
    api.post(`/submissions/${projectId}/chapters`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min for large file uploads
      onUploadProgress,
    }),

  /* ────── Read ────── */

  /** Get a single submission by ID */
  getSubmission: (submissionId) => api.get(`/submissions/${submissionId}`),

  /** List submissions for a project with optional filters & pagination */
  getSubmissionsByProject: (projectId, params) =>
    api.get(`/submissions/project/${projectId}`, { params }),

  /** Get version history for a specific chapter */
  getChapterHistory: (projectId, chapter) =>
    api.get(`/submissions/project/${projectId}/chapters/${chapter}`),

  /** Get only the latest version of a specific chapter */
  getLatestChapter: (projectId, chapter) =>
    api.get(`/submissions/project/${projectId}/chapters/${chapter}/latest`),

  /** Get a pre-signed URL to view the document */
  getViewUrl: (submissionId) => api.get(`/submissions/${submissionId}/view`),

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
   * @param {Object} data - { page?, content, highlightCoords? }
   */
  addAnnotation: (submissionId, data) => api.post(`/submissions/${submissionId}/annotations`, data),

  /**
   * Remove an annotation.
   * @param {string} submissionId
   * @param {string} annotationId
   */
  removeAnnotation: (submissionId, annotationId) =>
    api.delete(`/submissions/${submissionId}/annotations/${annotationId}`),

  /* ────── Student: proposal compilation ────── */

  /**
   * Compile and upload the full proposal document (chapters 1-3 combined).
   * Requires all three chapters to be locked/approved first.
   *
   * @param {string} projectId
   * @param {FormData} formData - Must contain 'file' and optionally 'remarks'
   * @param {Function} [onUploadProgress] - Axios progress callback
   */
  compileProposal: (projectId, formData, onUploadProgress) =>
    api.post(`/submissions/${projectId}/proposal`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min for large file uploads
      onUploadProgress,
    }),
};
