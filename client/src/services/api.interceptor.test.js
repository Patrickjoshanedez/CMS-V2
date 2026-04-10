import { beforeEach, describe, expect, it, vi } from 'vitest';

let onResponseError;
let mockApi;
let clearAuthState;

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockApi),
  },
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      clearAuthState,
    }),
  },
}));

describe('api response interceptor auth-refresh flow', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    clearAuthState = vi.fn();

    mockApi = vi.fn();
    mockApi.post = vi.fn();
    mockApi.interceptors = {
      response: {
        use: vi.fn((onFulfilled, onRejected) => {
          onResponseError = onRejected;
        }),
      },
    };

    await import('./api');
  });

  it('attempts refresh and retries the original request on first 401', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { success: true } });
    mockApi.mockResolvedValueOnce({ data: { retried: true } });

    const originalRequest = { url: '/users/me' };
    const error = {
      config: originalRequest,
      response: { status: 401 },
    };

    await expect(onResponseError(error)).resolves.toEqual({ data: { retried: true } });

    expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh');
    expect(mockApi).toHaveBeenCalledWith(expect.objectContaining({ url: '/users/me', _retry: true }));
    expect(clearAuthState).not.toHaveBeenCalled();
  });

  it('clears auth state when refresh fails after a 401', async () => {
    const refreshError = new Error('refresh failed');
    mockApi.post.mockRejectedValueOnce(refreshError);

    const originalRequest = { url: '/users/me' };
    const error = {
      config: originalRequest,
      response: { status: 401 },
    };

    await expect(onResponseError(error)).rejects.toThrow('refresh failed');
    expect(mockApi.post).toHaveBeenCalledWith('/auth/refresh');
    expect(clearAuthState).toHaveBeenCalledTimes(1);
  });
});
