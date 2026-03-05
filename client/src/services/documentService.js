import api from './api';

/**
 * Document API service — Google Docs template & project document calls.
 */

export const documentService = {
  /* ── Templates (Instructor) ── */

  createTemplate: (data) => api.post('/documents/templates', data),

  listTemplates: (params) => api.get('/documents/templates', { params }),

  getTemplate: (id) => api.get(`/documents/templates/${id}`),

  updateTemplate: (id, data) => api.patch(`/documents/templates/${id}`, data),

  deleteTemplate: (id) => api.delete(`/documents/templates/${id}`),

  /* ── Project Documents ── */

  generateDocument: (projectId, data) =>
    api.post(`/documents/projects/${projectId}/generate`, data),

  listProjectDocuments: (projectId, params) =>
    api.get(`/documents/projects/${projectId}`, { params }),

  getProjectDocument: (projectId, docId) =>
    api.get(`/documents/projects/${projectId}/${docId}`),

  deleteProjectDocument: (projectId, docId) =>
    api.delete(`/documents/projects/${projectId}/${docId}`),
};
