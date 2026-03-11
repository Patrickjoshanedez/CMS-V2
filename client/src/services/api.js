import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

/**
 * Axios API client configured for the CMS backend.
 * - Base URL from Vite env or defaults to /api (handled by Vite proxy).
 * - Credentials (cookies) sent with every request.
 * - 401 interceptor attempts token refresh once before logging out.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if we're currently refreshing to prevent infinite loops
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

const isAuthPublicRequest = (url = '') => {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/google') ||
    url.includes('/auth/register') ||
    url.includes('/auth/verify-otp') ||
    url.includes('/auth/resend-otp') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  );
};

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const skipAuthRefresh = Boolean(originalRequest?.skipAuthRefresh);

    // Auth endpoints that must never trigger a refresh retry to avoid infinite loops.
    const isAuthSelfRequest =
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/logout');

    const isPublicAuthRequest = isAuthPublicRequest(originalRequest.url);

    // If the refresh or logout endpoint itself fails, just clear state and reject.
    if (isAuthSelfRequest) {
      if (originalRequest.url?.includes('/auth/refresh')) {
        // Refresh failed — clear client auth state only; do not cascade another API logout call.
        isRefreshing = false;
        processQueue(error);
        useAuthStore.getState().clearAuthState();
      }
      return Promise.reject(error);
    }

    // Login/register/google failures are expected and should not trigger refresh flow.
    if (isPublicAuthRequest) {
      return Promise.reject(error);
    }

    // If we received a 429 (rate limited) on any auth call, do not retry.
    if (status === 429) {
      return Promise.reject(error);
    }

    // Caller requested no refresh retry behavior for this request.
    if (skipAuthRefresh) {
      return Promise.reject(error);
    }

    // If 401 and we haven't already retried this request, attempt token refresh.
    if (status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/auth/refresh');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        useAuthStore.getState().clearAuthState();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;
