import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ROLES } from '@cms/shared';
import { RoleRoute } from './App';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockState = {
  user: { _id: 'student-1', role: ROLES.STUDENT },
  isAuthenticated: true,
  sessionLoading: false,
  fetchUser: vi.fn(),
};

vi.mock('./stores/authStore', () => ({
  useAuthStore: (selector) => {
    if (typeof selector === 'function') {
      return selector(mockState);
    }
    return mockState;
  },
}));

const renderRoleRoute = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/admin/users']}>
        <Routes>
          <Route
            path="/admin/users"
            element={
              <RoleRoute allowedRoles={[ROLES.INSTRUCTOR]}>
                <div>Users content</div>
              </RoleRoute>
            }
          />
          <Route path="/forbidden" element={<div>403 Forbidden</div>} />
        </Routes>
      </MemoryRouter>,
    );
  });

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

describe('App role-protected routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows 403 forbidden page for student navigating to /admin/users', () => {
    const view = renderRoleRoute();

    expect(view.container.textContent).toContain('403 Forbidden');

    view.unmount();
  });
});
