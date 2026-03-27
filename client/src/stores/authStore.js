import { create } from 'zustand';
import { authService, userService } from '../services/authService';
import { disconnectSocket } from '../services/socket';

const NETWORK_ERROR_MESSAGE =
  'Cannot reach the server. Check your connection and ensure the API is running.';
const TIMEOUT_ERROR_MESSAGE = 'The request timed out. Please try again.';

const LOGIN_ERROR_MESSAGES_BY_CODE = {
  INVALID_CREDENTIALS: 'Invalid email or password.',
  EMAIL_NOT_VERIFIED: 'Please verify your email before logging in.',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated.',
  GOOGLE_ACCOUNT_PASSWORD_LOGIN_BLOCKED:
    'This account uses Google sign-in. Please continue with Google.',
  AUTH_REQUIRED: 'Your session expired. Please log in again.',
  TOO_MANY_REQUESTS: 'Too many login attempts. Please wait a moment and try again.',
};

const GOOGLE_LOGIN_ERROR_MESSAGES_BY_CODE = {
  GOOGLE_AUDIENCE_MISMATCH:
    'Google client configuration mismatch detected. Ensure frontend VITE_GOOGLE_CLIENT_ID matches server GOOGLE_AUTH_CLIENT_ID.',
  GOOGLE_NOT_CONFIGURED: 'Google login is not configured on the server.',
  GOOGLE_TOKEN_INVALID: 'Google sign-in token is invalid or expired. Please try again.',
  GOOGLE_PAYLOAD_INVALID: 'Google sign-in payload is invalid. Please try again.',
  GOOGLE_EMAIL_NOT_VERIFIED: 'Your Google account email is not verified.',
  ACCOUNT_DEACTIVATED: 'Your account has been deactivated.',
  MISSING_CREDENTIAL: 'Google sign-in did not return a valid credential. Please try again.',
  TOO_MANY_REQUESTS: 'Too many login attempts. Please wait a moment and try again.',
};

const extractErrorMessage = (error, fallbackMessage, codeMessages = {}) => {
  const apiError = error?.response?.data?.error;
  const apiCode = apiError?.code;
  const apiMessage = apiError?.message;

  if (apiCode && codeMessages[apiCode]) {
    return codeMessages[apiCode];
  }

  if (error?.code === 'ERR_NETWORK') {
    return NETWORK_ERROR_MESSAGE;
  }

  if (error?.code === 'ECONNABORTED') {
    return TIMEOUT_ERROR_MESSAGE;
  }

  if (error?.response?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  if (error?.response?.status >= 500) {
    return 'The server encountered an error. Please try again shortly.';
  }

  if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
    return apiMessage;
  }

  return fallbackMessage;
};

const runAuthRequest = async ({ set, request, fallbackMessage, onSuccess, codeMessages }) => {
  set({ loading: true, error: null });
  try {
    const response = await request();
    if (onSuccess) {
      onSuccess(response);
    }
    set({ loading: false });
    return response?.data;
  } catch (error) {
    set({
      loading: false,
      error: extractErrorMessage(error, fallbackMessage, codeMessages),
    });
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
      codeMessages: LOGIN_ERROR_MESSAGES_BY_CODE,
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
      codeMessages: GOOGLE_LOGIN_ERROR_MESSAGES_BY_CODE,
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
