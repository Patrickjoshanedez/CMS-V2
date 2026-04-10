import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

let onResponseError;
let mockApi;

const mockAuthState = {
  isAuthenticated: true,
  sessionLoading: false,
  user: { role: 'student' },
  fetchUser: vi.fn(),
  clearAuthState: vi.fn(() => {
    mockAuthState.isAuthenticated = false;
    mockAuthState.user = null;
  }),
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockApi),
  },
}));

vi.mock('./stores/authStore', () => {
  const useAuthStore = (selector) =>
    typeof selector === 'function' ? selector(mockAuthState) : mockAuthState;

  useAuthStore.getState = () => ({
    clearAuthState: mockAuthState.clearAuthState,
  });

  return { useAuthStore };
});

vi.mock('sonner', () => ({
  Toaster: () => null,
}));

vi.mock('./pages/dashboard/DashboardPage', () => ({
  default: () => <div>Dashboard Route</div>,
}));

vi.mock('./pages/auth/LoginPage', () => ({
  default: () => <div>Login Route</div>,
}));

const flushLazyRender = async () => {
  for (let i = 0; i < 30; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const renderAppAtPath = async (AppComponent, path) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <AppComponent />
      </MemoryRouter>,
    );
  });

  await flushLazyRender();

  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

describe('App session-timeout redirect behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockAuthState.isAuthenticated = true;
    mockAuthState.sessionLoading = false;
    mockAuthState.user = { role: 'student' };
    mockAuthState.fetchUser = vi.fn();
    mockAuthState.clearAuthState = vi.fn(() => {
      mockAuthState.isAuthenticated = false;
      mockAuthState.user = null;
    });

    mockApi = vi.fn();
    mockApi.post = vi.fn();
    mockApi.interceptors = {
      response: {
        use: vi.fn((_onFulfilled, onRejected) => {
          onResponseError = onRejected;
        }),
      },
    };
  });

  it('redirects to /login for protected routes when refresh fails after a 401', async () => {
    await import('./services/api');

    const refreshFailure = {
      config: { url: '/auth/refresh' },
      response: { status: 401 },
    };

    mockApi.post.mockRejectedValueOnce(refreshFailure);

    await expect(
      onResponseError({
        config: { url: '/users/me' },
        response: { status: 401 },
      }),
    ).rejects.toBe(refreshFailure);

    expect(mockAuthState.clearAuthState).toHaveBeenCalledTimes(1);

    const { default: App } = await import('./App');
    const view = await renderAppAtPath(App, '/dashboard');

    expect(view.container.textContent).toContain('Login Route');
    expect(view.container.textContent).not.toContain('Dashboard Route');

    view.unmount();
  });
});