import { beforeEach, describe, expect, it, vi } from 'vitest';

const responseUse = vi.fn();
const post = vi.fn();
const clearAuthState = vi.fn();

const axiosInstance = {
  interceptors: {
    response: {
      use: responseUse,
    },
  },
  post,
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => axiosInstance),
  },
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      clearAuthState,
    }),
  },
}));

describe('api refresh fallback behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clears auth state when refresh fails after a protected endpoint 401', async () => {
    await import('./api');

    const [, onRejected] = responseUse.mock.calls[0];

    const originalRequest = {
      url: '/users/me',
      _retry: false,
    };
    const initial401 = {
      config: originalRequest,
      response: { status: 401 },
    };
    const refreshFailure = {
      config: { url: '/auth/refresh' },
      response: { status: 401 },
    };

    post.mockRejectedValueOnce(refreshFailure);

    await expect(onRejected(initial401)).rejects.toBe(refreshFailure);
    expect(post).toHaveBeenCalledWith('/auth/refresh');
    expect(clearAuthState).toHaveBeenCalledTimes(1);
  });
});
