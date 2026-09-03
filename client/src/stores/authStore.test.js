import { beforeEach, describe, expect, it, vi } from 'vitest';

const loginMock = vi.fn();
const googleLoginMock = vi.fn();
const getMeMock = vi.fn();
const disconnectSocketMock = vi.fn();
const clearMock = vi.fn();

vi.mock('../services/authService', () => ({
  authService: {
    login: (...args) => loginMock(...args),
    googleLogin: (...args) => googleLoginMock(...args),
  },
  userService: {
    getMe: (...args) => getMeMock(...args),
  },
}));

vi.mock('../services/socket', () => ({
  disconnectSocket: () => disconnectSocketMock(),
}));

vi.mock('@/lib/queryClient', () => ({
  appQueryClient: {
    clear: () => clearMock(),
  },
}));

import { useAuthStore } from './authStore';

describe('useAuthStore login flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      loading: false,
      sessionLoading: true,
      error: null,
    });
  });

  it('uses the login response user instead of waiting for getMe', async () => {
    const loginUser = { _id: 'user-1', email: 'student@example.com' };

    loginMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          user: loginUser,
        },
      },
    });

    const result = await useAuthStore.getState().login({
      email: 'student@example.com',
      password: 'Password123',
    });

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(getMeMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      data: {
        user: loginUser,
      },
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toEqual(loginUser);
  });

  it('falls back to getMe only when the login response omits user data', async () => {
    const loginUser = { _id: 'user-2', email: 'fallback@example.com' };

    loginMock.mockResolvedValueOnce({
      data: {
        success: true,
      },
    });
    getMeMock.mockResolvedValueOnce({
      data: {
        data: {
          user: loginUser,
        },
      },
    });

    const result = await useAuthStore.getState().login({
      email: 'fallback@example.com',
      password: 'Password123',
    });

    expect(loginMock).toHaveBeenCalledTimes(1);
    expect(getMeMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user).toEqual(loginUser);
  });
});
