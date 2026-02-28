import { create } from 'zustand';
import { authService, userService } from '../services/authService';

/**
 * Auth Store (Zustand) — manages authentication state.
 *
 * Since JWTs are stored in HTTP-only cookies (not accessible via JS),
 * we track `isAuthenticated` and `user` client-side for UI purposes.
 * Actual auth enforcement happens server-side.
 */
export const useAuthStore = create((set, _get) => ({
  // State
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,

  // Actions

  /**
   * Register a new user. Does NOT set isAuthenticated —
   * user must verify OTP first.
   */
  register: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.register(data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Registration failed.';
      set({ loading: false, error: message });
      throw error;
    }
  },

  /**
   * Verify OTP after registration or for password reset.
   */
  verifyOtp: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.verifyOtp(data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'OTP verification failed.';
      set({ loading: false, error: message });
      throw error;
    }
  },

  /**
   * Resend OTP to the given email.
   */
  resendOtp: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.resendOtp(data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to resend OTP.';
      set({ loading: false, error: message });
      throw error;
    }
  },

  /**
   * Log in — on success, cookies are set by the server.
   * We fetch the user profile to populate the store.
   */
  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const loginResponse = await authService.login(data);
      const userResponse = await userService.getMe();

      set({
        user: userResponse.data.data.user,
        isAuthenticated: true,
        loading: false,
      });

      return loginResponse.data;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Login failed.';
      set({ loading: false, error: message, isAuthenticated: false, user: null });
      throw error;
    }
  },

  /**
   * Fetch the current user profile (used on app init to restore session).
   */
  fetchUser: async () => {
    try {
      const response = await userService.getMe();
      set({
        user: response.data.data.user,
        isAuthenticated: true,
      });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  /**
   * Log out — clears cookies server-side and resets client state.
   */
  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Even if logout API fails, clear client state
    } finally {
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  /**
   * Forgot password — sends OTP to email.
   */
  forgotPassword: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.forgotPassword(data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Failed to send reset email.';
      set({ loading: false, error: message });
      throw error;
    }
  },

  /**
   * Reset password with OTP code.
   */
  resetPassword: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await authService.resetPassword(data);
      set({ loading: false });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Password reset failed.';
      set({ loading: false, error: message });
      throw error;
    }
  },

  /** Clear any stored error */
  clearError: () => set({ error: null }),
}));
