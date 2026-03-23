import api from './api';

/**
 * Document API service — manuscript workflow calls.
 */

export const documentService = {
  /* ── Manuscripts ── */

  uploadManuscript: (projectId, payload) =>
    api.post(`/documents/projects/${projectId}/manuscripts`, payload),

  listProjectManuscripts: (projectId) =>
    api.get(`/documents/projects/${projectId}/manuscripts`),

  getOpenLink: (projectId, documentType) =>
    api.get(`/documents/projects/${projectId}/manuscripts/${documentType}/open-link`),

  syncPermissions: (projectId, documentType) =>
    api.post(`/documents/projects/${projectId}/manuscripts/${documentType}/sync-permissions`),

  submitReview: (projectId, documentType) =>
    api.post(`/documents/projects/${projectId}/manuscripts/${documentType}/submit-review`),

  syncComments: (projectId, documentType) =>
    api.post(`/documents/projects/${projectId}/manuscripts/${documentType}/sync-comments`),

  getArchivedComments: (projectId, documentType) =>
    api.get(`/documents/projects/${projectId}/manuscripts/${documentType}/comments`),
};
