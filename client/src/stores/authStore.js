import { create } from 'zustand';
import { authService, userService } from '../services/authService';
import { disconnectSocket } from '../services/socket';

const extractErrorMessage = (error, fallbackMessage) =>
  error.response?.data?.error?.message || fallbackMessage;

const runAuthRequest = async ({ set, request, fallbackMessage, onSuccess }) => {
  set({ loading: true, error: null });
  try {
    const response = await request();
    if (onSuccess) {
      onSuccess(response);
    }
    set({ loading: false });
    return response?.data;
  } catch (error) {
    set({ loading: false, error: extractErrorMessage(error, fallbackMessage) });
    throw error;
  }
};

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
  /**
   * True while we're checking the server for an existing session on app init.
   * Routes should not render until this is false to avoid flash-redirects to /login.
   */
  sessionLoading: true,
  error: null,

  // Actions

  /**
   * Register a new user. Does NOT set isAuthenticated —
   * user must verify OTP first.
   */
  register: async (data) => {
    return runAuthRequest({
      set,
      request: () => authService.register(data),
      fallbackMessage: 'Registration failed.',
    });
  },

  /**
   * Verify OTP after registration or for password reset.
   */
  verifyOtp: async (data) => {
    return runAuthRequest({
      set,
      request: () => authService.verifyOtp(data),
      fallbackMessage: 'OTP verification failed.',
    });
  },

  /**
   * Resend OTP to the given email.
   */
  resendOtp: async (data) => {
    return runAuthRequest({
      set,
      request: () => authService.resendOtp(data),
      fallbackMessage: 'Failed to resend OTP.',
    });
  },

  /**
   * Log in — on success, cookies are set by the server.
   * We fetch the user profile to populate the store.
   */
  login: async (data) => {
    return runAuthRequest({
      set,
      request: async () => {
        const loginResponse = await authService.login(data);
        const userResponse = await userService.getMe();
        return { loginResponse, userResponse };
      },
      fallbackMessage: 'Login failed.',
      onSuccess: ({ userResponse }) => {
        set({ user: userResponse.data.data.user, isAuthenticated: true });
      },
    })
      .catch((error) => {
        set({ isAuthenticated: false, user: null });
        throw error;
      })
      .then((response) => response.loginResponse.data);
  },

  /**
   * Log in with Google — server verifies the ID token and sets cookies.
   * We fetch the user profile to populate the store.
   */
  googleLogin: async (credential) => {
    return runAuthRequest({
      set,
      request: async () => {
        await authService.googleLogin({ credential });
        return userService.getMe();
      },
      fallbackMessage: 'Google login failed.',
      onSuccess: (userResponse) => {
        set({ user: userResponse.data.data.user, isAuthenticated: true });
      },
    }).catch((error) => {
      set({ isAuthenticated: false, user: null });
      throw error;
    });
  },

  /**
   * Fetch the current user profile (used on app init to restore session).
   * Always sets sessionLoading: false when complete.
   */
  fetchUser: async () => {
    try {
      const response = await userService.getMe({ skipAuthRefresh: true });
      set({
        user: response.data.data.user,
        isAuthenticated: true,
        sessionLoading: false,
      });
    } catch {
      set({ user: null, isAuthenticated: false, sessionLoading: false });
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
      disconnectSocket();
      set({ user: null, isAuthenticated: false, error: null });
    }
  },

  /**
   * Clear local auth state without calling server logout.
   * Used when refresh fails or when auth endpoints return expected 401s.
   */
  clearAuthState: () => {
    disconnectSocket();
    set({ user: null, isAuthenticated: false, error: null });
  },

  /**
   * Forgot password — sends OTP to email.
   */
  forgotPassword: async (data) => {
    return runAuthRequest({
      set,
      request: () => authService.forgotPassword(data),
      fallbackMessage: 'Failed to send reset email.',
    });
  },

  /**
   * Reset password with OTP code.
   */
  resetPassword: async (data) => {
    return runAuthRequest({
      set,
      request: () => authService.resetPassword(data),
      fallbackMessage: 'Password reset failed.',
    });
  },

  /** Clear any stored error */
  clearError: () => set({ error: null }),
}));
