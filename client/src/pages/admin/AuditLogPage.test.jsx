import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLES } from '@cms/shared';
import AuditLogPage from './AuditLogPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseAuditLogs = vi.fn();

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { _id: 'inst-1', role: ROLES.INSTRUCTOR },
  }),
}));

vi.mock('@/hooks/useAuditLogs', () => ({
  useAuditLogs: (...args) => mockUseAuditLogs(...args),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const buildAuditHookResult = (logs = []) => ({
  data: {
    logs,
    total: logs.length,
    totalPages: 1,
  },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  isFetching: false,
});

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuditLogs.mockReturnValue(
      buildAuditHookResult([
        {
          _id: 'log-1',
          action: 'login.success',
          targetType: 'User',
          description: 'User logged in',
          actor: { firstName: 'Test', lastName: 'Instructor' },
          actorRole: 'instructor',
          createdAt: '2026-04-10T10:00:00.000Z',
        },
      ]),
    );
  });

  const renderPage = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<AuditLogPage />);
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

  it('TC-AUDIT-001: renders audit page and log list', () => {
    const view = renderPage();

    expect(view.container.textContent).toContain('Activity Log');
    expect(view.container.textContent).toContain('User logged in');

    view.unmount();
  });

  it('TC-AUDIT-002: renders keyword search filter input', () => {
    const view = renderPage();

    const actionInput = view.container.querySelector('#actionFilter');
    expect(actionInput).toBeTruthy();
    expect(actionInput.getAttribute('placeholder')).toContain('project.created');

    view.unmount();
  });

  it('TC-AUDIT-003: renders start/end date range filters', () => {
    const view = renderPage();

    const startInput = view.container.querySelector('#startDate');
    const endInput = view.container.querySelector('#endDate');
    expect(startInput).toBeTruthy();
    expect(endInput).toBeTruthy();

    view.unmount();
  });
});
