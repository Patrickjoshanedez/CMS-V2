import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import EmptyProjectState from './EmptyProjectState';
import { projectService } from '@/services/authService';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/services/authService', () => ({
  projectService: {
    getCreateProjectDraft: vi.fn(),
    clearCreateProjectDraft: vi.fn(),
  },
}));

const renderComponent = (props = {}) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(<EmptyProjectState {...props} />);
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

describe('EmptyProjectState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
    projectService.getCreateProjectDraft.mockResolvedValue({
      data: { data: { draft: null } },
    });
    projectService.clearCreateProjectDraft.mockResolvedValue({});
  });

  it('renders "Proceed to Create Capstone Proposal" when team is locked and no draft exists', async () => {
    const team = { isLocked: true, members: [{ _id: 'm1' }] };
    const view = renderComponent({ team });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(view.container.textContent).toContain('Proceed to Create Capstone Proposal');
    expect(view.container.textContent).toContain('Create Capstone Proposal');

    view.unmount();
  });

  it('renders team lock warning when team is not locked', () => {
    const team = { isLocked: false, members: [{ _id: 'm1' }] };
    const view = renderComponent({ team });

    expect(view.container.textContent).toContain(
      'Finalize and lock your team first before creating a project.',
    );
    expect(view.container.textContent).toContain('Go to Dashboard');

    view.unmount();
  });

  it('renders "Resume Capstone Proposal" when active proposal draft exists in localStorage', async () => {
    window.localStorage.setItem(
      'cms.create_project_draft',
      JSON.stringify({
        titleProposals: [{ title: 'Saved Title In LocalStorage' }],
      }),
    );

    const team = { isLocked: true, members: [{ _id: 'm1' }] };
    const view = renderComponent({ team });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(view.container.textContent).toContain('Resume Capstone Proposal');
    expect(view.container.textContent).toContain('Resume Proposal Draft');
    expect(view.container.textContent).toContain('Start Fresh Proposal');

    view.unmount();
  });

  it('navigates to /project/create on Resume Proposal Draft click', async () => {
    window.localStorage.setItem(
      'cms.create_project_draft',
      JSON.stringify({
        titleProposals: [{ title: 'Saved Title In LocalStorage' }],
      }),
    );

    const team = { isLocked: true, members: [{ _id: 'm1' }] };
    const view = renderComponent({ team });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    const resumeBtn = Array.from(view.container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Resume Proposal Draft'),
    );
    expect(resumeBtn).toBeTruthy();

    act(() => {
      resumeBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/project/create');

    view.unmount();
  });
});
