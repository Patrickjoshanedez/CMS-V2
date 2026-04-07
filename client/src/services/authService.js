import api from './api';

/**
 * Auth API service — all authentication-related HTTP calls.
 */

export const authService = {
  register: (registrationPayload) => api.post('/auth/register', registrationPayload),
  login: (credentials) => api.post('/auth/login', credentials),
  googleLogin: (googleAuthPayload) => api.post('/auth/google', googleAuthPayload),
  verifyOtp: (otpPayload) => api.post('/auth/verify-otp', otpPayload),
  resendOtp: (userIdPayload) => api.post('/auth/resend-otp', userIdPayload),
  forgotPassword: (emailPayload) => api.post('/auth/forgot-password', emailPayload),
  resetPassword: (resetPayload) => api.post('/auth/reset-password', resetPayload),
  changePassword: (passwordPayload) => api.post('/auth/change-password', passwordPayload),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

/**
 * User API service — user profile and management calls.
 */

export const userService = {
  getMe: (config = {}) => api.get('/users/me', config),
  updateMe: (updatePayload) => api.patch('/users/me', updatePayload),
  uploadAvatar: (avatarFormData) => api.post('/users/me/avatar', avatarFormData),
  listUsers: (queryParams) => api.get('/users', { params: queryParams }),
  listInstructors: () => api.get('/users/instructors'),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.patch(`/users/${id}`, data),
  changeRole: (id, data) => api.patch(`/users/${id}/role`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
  importStudents: (formData) =>
    api.post('/users/import-students', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

/**
 * Team API service — team management calls.
 */

export const teamService = {
  createTeam: (data) => api.post('/teams', data),
  getMyTeam: () => api.get('/teams/me'),
  listInviteCandidates: (teamId, params) =>
    api.get(`/teams/${teamId}/invite-candidates`, { params }),
  inviteMember: (teamId, data) => api.post(`/teams/${teamId}/invite`, data),
  acceptInvite: (token) => api.post(`/teams/invites/${token}/accept`),
  declineInvite: (token) => api.post(`/teams/invites/${token}/decline`),
  assignMemberRole: (teamId, memberId, data) =>
    api.patch(`/teams/${teamId}/members/${memberId}/role`, data),
  updateGoogleDocLink: (teamId, data) => api.patch(`/teams/${teamId}/google-doc-link`, data),
  lockTeam: (teamId) => api.patch(`/teams/${teamId}/lock`),
  listTeams: (params) => api.get('/teams', { params }),
};

/**
 * Notification API service.
 */

export const notificationService = {
  getNotifications: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications'),
};

/**
 * Project API service — capstone project management calls.
 */

export const projectService = {
  // Student / team-leader routes
  createProject: (data) => api.post('/projects', data),
  getMyProject: () => api.get('/projects/me'),
  updateTitle: (id, data) => api.patch(`/projects/${id}/title`, data),
  submitTitle: (id) => api.post(`/projects/${id}/title/submit`),
  reviseAndResubmit: (id, data) => api.patch(`/projects/${id}/title/revise`, data),
  requestTitleModification: (id, data) => api.post(`/projects/${id}/title/modification`, data),

  // Real-time title similarity check
  checkTitleSimilarity: (data) => api.post('/projects/title-check', data),

  // Instructor routes
  approveTitle: (id) => api.post(`/projects/${id}/title/approve`),
  rejectTitle: (id, data) => api.post(`/projects/${id}/title/reject`, data),
  addTitleComment: (projectId, proposalId, data) =>
    api.post(`/projects/${projectId}/title-proposals/${proposalId}/comments`, data),
  resolveTitleModification: (id, data) =>
    api.post(`/projects/${id}/title/modification/resolve`, data),
  assignAdviser: (id, data) => api.post(`/projects/${id}/adviser`, data),
  assignPanelist: (id, data) => api.post(`/projects/${id}/panelists`, data),
  removePanelist: (id, data) => api.delete(`/projects/${id}/panelists`, { data }),
  setDeadlines: (id, data) => api.patch(`/projects/${id}/deadlines`, data),
  rejectProject: (id, data) => api.post(`/projects/${id}/reject`, data),

  // Panelist route
  selectAsPanelist: (id) => api.post(`/projects/${id}/panelists/select`),

  // Phase advancement (instructor)
  advancePhase: (id) => api.post(`/projects/${id}/advance-phase`),

  // Prototype routes
  addPrototypeLink: (id, data) => api.post(`/projects/${id}/prototypes/link`, data),
  addPrototypeMedia: (id, formData) =>
    api.post(`/projects/${id}/prototypes/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getPrototypes: (id) => api.get(`/projects/${id}/prototypes`),
  removePrototype: (id, prototypeId) => api.delete(`/projects/${id}/prototypes/${prototypeId}`),

  // Archive & Completion routes
  archiveProject: (id, data) => api.post(`/projects/${id}/archive`, data),
  searchArchive: (params) => api.get('/projects/archive/search', { params }),
  uploadCertificate: (id, formData) =>
    api.post(`/projects/${id}/certificate`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getCertificateUrl: (id) => api.get(`/projects/${id}/certificate`),
  generateReport: (params) => api.get('/projects/reports', { params }),
  bulkUploadArchive: (payload) => {
    const formData = payload instanceof FormData ? payload : new FormData();

    if (!(payload instanceof FormData)) {
      formData.append('title', payload.title);
      if (payload.abstract) formData.append('abstract', payload.abstract);
      if (payload.keywords) formData.append('keywords', payload.keywords);
      formData.append('academicYear', payload.academicYear);
      formData.append('academicPaperFile', payload.academicPaperFile);
      formData.append('academicJournalFile', payload.academicJournalFile);
    }

    return api.post('/projects/archive/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  // Faculty shared routes
  getProject: (id) => api.get(`/projects/${id}`),
  listProjects: (params) => api.get('/projects', { params }),
};

/**
 * Dashboard API service — role-aware dashboard statistics.
 */

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
};

/**
 * Academic hierarchy API service — courses, sections, years, and drill-down hierarchy.
 */

export const academicService = {
  listCourses: () => api.get('/academics/courses'),
  createCourse: (data) => api.post('/academics/courses', data),
  listSections: (params) => api.get('/academics/sections', { params }),
  createSection: (data) => api.post('/academics/sections', data),
  listAcademicYears: () => api.get('/academics/academic-years'),
  createAcademicYear: (data) => api.post('/academics/academic-years', data),
  getHierarchy: (params) => api.get('/academics/hierarchy', { params }),
};

/**
 * Document API service — document-related operations.
 */
export const documentService = {
  /**
   * Extract title and abstract metadata from a PDF file.
   * @param {File} file - The PDF file to extract metadata from
   * @returns {Promise<{title: string, abstract: string, confidence: {title: number, abstract: number}}>}
   */
  extractPdfMetadata: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/extract-pdf-metadata', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
