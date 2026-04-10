import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectHistoryCard } from './ProjectDetailPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseEntityAuditHistory = vi.fn();

vi.mock('@/hooks/useAuditLogs', () => ({
  useEntityAuditHistory: (...args) => mockUseEntityAuditHistory(...args),
}));

describe('ProjectHistoryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEntityAuditHistory.mockReturnValue({
      data: [
        {
          _id: 'audit-1',
          action: 'project.updated',
          actorRole: 'instructor',
          description: 'Updated project title',
          createdAt: '2026-04-10T10:30:00.000Z',
        },
      ],
      isLoading: false,
      isError: false,
    });
  });

  const renderCard = () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      root.render(<ProjectHistoryCard projectId="project-123" />);
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

  it('TC-AUDIT-004: renders History tab and project change entries', () => {
    const view = renderCard();

    const historyTab = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('History'),
    );
    expect(historyTab).toBeTruthy();

    act(() => {
      historyTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(view.container.textContent).toContain('project.updated');
    expect(view.container.textContent).toContain('Updated project title');
    expect(mockUseEntityAuditHistory).toHaveBeenCalledWith('Project', 'project-123', 100);

    view.unmount();
  });
});
