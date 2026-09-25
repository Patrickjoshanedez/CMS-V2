import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommitteeAssignmentsPage from './CommitteeAssignmentsPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/users/TeamCommitteeAssignmentsView', () => ({
  default: () => (
    <div data-testid="team-committee-assignments-view">Team Committee Assignments View</div>
  ),
}));

describe('CommitteeAssignmentsPage', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('renders DashboardLayout and TeamCommitteeAssignmentsView', async () => {
    await act(async () => {
      root.render(<CommitteeAssignmentsPage />);
    });

    const layout = container.querySelector('[data-testid="dashboard-layout"]');
    expect(layout).not.toBeNull();

    const view = container.querySelector('[data-testid="team-committee-assignments-view"]');
    expect(view).not.toBeNull();
    expect(view.textContent).toContain('Team Committee Assignments View');
  });
});
