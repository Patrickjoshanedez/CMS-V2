import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Capstone2CollapsibleSections from './Capstone2CollapsibleSections';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./InteractiveGanttChart', () => ({
  default: ({ isReadOnly }) => (
    <div data-testid="mock-gantt-chart" data-readonly={String(isReadOnly)}>
      Interactive Gantt Chart
    </div>
  ),
}));

vi.mock('./ActionDoneMatrixTab', () => ({
  default: ({ initialMilestone }) => (
    <div data-testid="mock-adm-tab" data-milestone={initialMilestone}>
      Action Done Matrix Tab Scoped ({initialMilestone})
    </div>
  ),
}));

vi.mock('./EvaluationPanel', () => ({
  default: ({ defenseType }) => (
    <div data-testid="mock-evaluation-panel" data-defensetype={defenseType}>
      Evaluation Panel ({defenseType})
    </div>
  ),
}));

const mockProject = {
  _id: 'proj-102',
  title: 'Autonomous Agricultural Drone Delivery',
  actionDoneMatrix: [
    {
      _id: 'adm-1',
      milestone: 'CAPSTONE_2',
      panelRecommendation: 'Add collision avoidance tests',
      actionTaken: 'Integrated ultrasonic obstacle sensors',
      status: 'verified',
    },
  ],
  admStatus: 'submitted',
  admSignatures: {
    secretary: { endorsed: true },
  },
};

describe('Capstone2CollapsibleSections Component Suite', () => {
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

  const renderComponent = async (props = {}) => {
    await act(async () => {
      root.render(
        <Capstone2CollapsibleSections
          project={mockProject}
          isFaculty
          user={{ role: 'faculty', _id: 'u-faculty' }}
          {...props}
        />,
      );
    });
  };

  it('renders all 3 section headers in compact, organized format', async () => {
    await renderComponent();

    expect(container.textContent).toContain('System Development & Academic Gantt Chart');
    expect(container.textContent).toContain('Action Done Matrix (ADM v2)');
    expect(container.textContent).toContain('Defense Evaluation & Grade Sign-Off');
    expect(container.textContent).toContain('Secretary Endorsed');
  });

  it('renders InteractiveGanttChart by default in section 1', async () => {
    await renderComponent();

    const gantt = container.querySelector('[data-testid="mock-gantt-chart"]');
    expect(gantt).toBeTruthy();
  });

  it('toggles ADM section and mounts ActionDoneMatrixTab with initialMilestone="CAPSTONE_2"', async () => {
    await renderComponent();

    expect(container.querySelector('[data-testid="mock-adm-tab"]')).toBeNull();

    const toggleAdmBtn = container.querySelector('[data-testid="toggle-adm-section"]');
    await act(async () => {
      toggleAdmBtn.click();
    });

    const admTab = container.querySelector('[data-testid="mock-adm-tab"]');
    expect(admTab).toBeTruthy();
    expect(admTab.getAttribute('data-milestone')).toBe('CAPSTONE_2');
  });

  it('toggles Evaluation section and mounts EvaluationPanel with defenseType="midterm"', async () => {
    await renderComponent();

    expect(container.querySelector('[data-testid="mock-evaluation-panel"]')).toBeNull();

    const toggleEvalBtn = container.querySelector('[data-testid="toggle-evaluation-section"]');
    await act(async () => {
      toggleEvalBtn.click();
    });

    const evalPanel = container.querySelector('[data-testid="mock-evaluation-panel"]');
    expect(evalPanel).toBeTruthy();
    expect(evalPanel.getAttribute('data-defensetype')).toBe('midterm');
  });
});
