import api from './api';

/**
 * Auth API service — all authentication-related HTTP calls.
 */

export const authService = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

/**
 * User API service — user profile and management calls.
 */

export const userService = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.patch('/users/me', data),
  listUsers: (params) => api.get('/users', { params }),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.patch(`/users/${id}`, data),
  changeRole: (id, data) => api.patch(`/users/${id}/role`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

/**
 * Team API service — team management calls.
 */

export const teamService = {
  createTeam: (data) => api.post('/teams', data),
  getMyTeam: () => api.get('/teams/me'),
  inviteMember: (teamId, data) => api.post(`/teams/${teamId}/invite`, data),
  acceptInvite: (token) => api.post(`/teams/invites/${token}/accept`),
  declineInvite: (token) => api.post(`/teams/invites/${token}/decline`),
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
