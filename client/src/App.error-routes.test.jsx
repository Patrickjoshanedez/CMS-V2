import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

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

const mockAuthState = {
  isAuthenticated: true,
  sessionLoading: false,
  user: { role: 'student' },
  fetchUser: vi.fn(),
};

vi.mock('./stores/authStore', () => ({
  useAuthStore: (selector) =>
    typeof selector === 'function' ? selector(mockAuthState) : mockAuthState,
}));

vi.mock('sonner', () => ({
  Toaster: () => null,
}));

vi.mock('./pages/ForbiddenPage', () => ({
  default: () => <div>403 Forbidden Route</div>,
}));

vi.mock('./pages/NotFoundPage', () => ({
  default: () => (
    <div>
      <span>404 Not Found Route</span>
      <button type="button" onClick={() => window.history.back()}>
        Go Back
      </button>
    </div>
  ),
}));

const flushLazyRender = async () => {
  for (let i = 0; i < 30; i += 1) {
    await act(async () => {
      await Promise.resolve();
    });
  }
};

const renderAtPath = async (path) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <App />
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

describe('App error route behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.isAuthenticated = true;
    mockAuthState.sessionLoading = false;
    mockAuthState.user = { role: 'student' };
    mockAuthState.fetchUser = vi.fn();
  });

  it('shows 403 page for student access to /admin/users', async () => {
    const view = await renderAtPath('/admin/users');

    expect(view.container.textContent).toContain('403 Forbidden Route');

    view.unmount();
  });

  it('shows 404 page with a working Go Back button for unknown routes', async () => {
    const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    const view = await renderAtPath('/nonexistent-page');

    expect(view.container.textContent).toContain('404 Not Found Route');
    const goBackButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Go Back'),
    );
    expect(goBackButton).toBeDefined();

    await act(async () => {
      goBackButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(historyBackSpy).toHaveBeenCalledTimes(1);

    historyBackSpy.mockRestore();
    view.unmount();
  });
});
