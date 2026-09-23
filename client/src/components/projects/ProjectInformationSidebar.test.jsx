import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProjectInformationSidebar from './ProjectInformationSidebar';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/projects/FacultyWidget', () => ({
  default: () => <div data-testid="faculty-widget">Faculty Committee & Proponent Roster</div>,
}));

vi.mock('@/components/projects/ProjectContextWidget', () => ({
  default: () => <div data-testid="project-context-widget">Project Context</div>,
}));

vi.mock('@/components/projects/AcademicReportsWidget', () => ({
  default: () => <div data-testid="academic-reports-widget">Academic Reports</div>,
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

describe('ProjectInformationSidebar Component', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  const mockProject = {
    _id: 'proj-123',
    title: 'Automated Disaster Early Warning System',
    similarityScore: 11.2,
    panelistIds: ['p1', 'p2', 'p3'],
    evaluations: [
      { _id: 'e1', score: 85 },
      { _id: 'e2', score: 95 },
    ],
  };

  const renderComponent = async (props = {}) => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ProjectInformationSidebar project={mockProject} {...props} />
        </QueryClientProvider>,
      );
    });
  };

  it('renders executive KPI cards with calculated average score', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Avg Score');
    expect(container.textContent).toContain('90%');
    expect(container.textContent).toContain('Panelists');
    expect(container.textContent).toContain('3');
    expect(container.textContent).toContain('Total Evals');
    expect(container.textContent).toContain('2');
  });

  it('renders Evaluation Summary, Plagiarism Threshold, and child widgets', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Evaluation Summary');
    expect(container.textContent).toContain('Plagiarism Threshold');
    expect(container.textContent).toContain('11.2% / 15.0% Max');
    expect(container.querySelector('[data-testid="faculty-widget"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="project-context-widget"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="academic-reports-widget"]')).toBeTruthy();
  });

  it('displays N/A when there are no evaluations recorded', async () => {
    const emptyEvalsProject = { ...mockProject, evaluations: [] };
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <ProjectInformationSidebar project={emptyEvalsProject} />
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain('N/A');
  });
});
