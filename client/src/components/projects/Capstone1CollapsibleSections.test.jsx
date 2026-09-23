import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Capstone1CollapsibleSections from './Capstone1CollapsibleSections';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useSubmissions', () => ({
  useProjectSubmissions: () => ({
    data: [
      { _id: 'sub-1', chapterNumber: 1, version: 1, status: 'approved', plagiarismScore: 5 },
      { _id: 'sub-2', chapterNumber: 2, version: 1, status: 'pending', plagiarismScore: 12 },
      { _id: 'sub-prop', type: 'proposal', version: 1, status: 'approved' },
    ],
  }),
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

vi.mock('@/components/submissions/ChapterReviewPanel', () => ({
  default: () => <div data-testid="mock-chapter-review-panel">Chapter Review Panel</div>,
}));

vi.mock('./ProposalRehearsalModal', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="mock-rehearsal-modal">
        <button onClick={onClose}>Close Rehearsal</button>
      </div>
    ) : null,
}));

vi.mock('@/components/documents/SophisticatedDocumentViewer', () => ({
  default: ({ open, onOpenChange, chapterTitle }) =>
    open ? (
      <div data-testid="mock-doc-viewer">
        <span>{chapterTitle}</span>
        <button onClick={() => onOpenChange(false)}>Close Viewer</button>
      </div>
    ) : null,
}));

const mockProject = {
  _id: 'proj-101',
  title: 'Edge-AI Microclimate Monitoring and Foliar Disease Classification',
  titleStatus: 'approved',
  abstract:
    'Smallholder highland farmers lose substantial crop yields to fast-spreading fungal blights.',
  titleProposals: [
    {
      _id: 'prop-1',
      title: 'Edge-AI Microclimate Monitoring and Foliar Disease Classification',
    },
  ],
  titleProposalMetadata: [
    {
      _id: 'prop-1',
      title: 'Edge-AI Microclimate Monitoring and Foliar Disease Classification',
      pitchDeck: {
        problemStatement: 'Smallholder highland farmers lose substantial crop yields.',
        proposedSolution: 'An on-premise ESP32-CAM and Raspberry Pi edge-node pipeline.',
        uniqueContribution: 'On-device edge inference without continuous cloud access.',
        targetUsers: 'Highland agrarian cooperatives and vegetable growers.',
        expectedImpact: 'Reduces diagnostic turnaround from days to under five seconds.',
      },
      sdgs: [2, 9, 13],
      disciplines: ['Artificial Intelligence', 'Internet of Things'],
      status: 'approved',
    },
  ],
};

describe('Capstone1CollapsibleSections Component Suite', () => {
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
        <Capstone1CollapsibleSections
          project={mockProject}
          isStudent={true}
          user={{ _id: 'stu-1', role: 'student' }}
          onTabChange={vi.fn()}
          onRefresh={vi.fn()}
          {...props}
        />,
      );
    });
  };

  it('renders all 4 sections collapsed by default', async () => {
    await renderComponent();

    const proposalBtn = container.querySelector('[data-testid="toggle-proposal-stage"]');
    const manuscriptBtn = container.querySelector('[data-testid="toggle-manuscript-section"]');
    const admBtn = container.querySelector('[data-testid="toggle-adm-section"]');
    const evalBtn = container.querySelector('[data-testid="toggle-evaluation-section"]');

    expect(proposalBtn).toBeTruthy();
    expect(manuscriptBtn).toBeTruthy();
    expect(admBtn).toBeTruthy();
    expect(evalBtn).toBeTruthy();

    expect(proposalBtn.getAttribute('aria-expanded')).toBe('false');
    expect(manuscriptBtn.getAttribute('aria-expanded')).toBe('false');
    expect(admBtn.getAttribute('aria-expanded')).toBe('false');
    expect(evalBtn.getAttribute('aria-expanded')).toBe('false');

    // Content should NOT be in the DOM when collapsed
    expect(container.textContent).not.toContain('Problem Statement');
    expect(container.textContent).not.toContain('Chapter 1: Problem Definition & Objectives');
    expect(container.querySelector('[data-testid="mock-adm-tab"]')).toBeNull();
    expect(container.querySelector('[data-testid="mock-evaluation-panel"]')).toBeNull();
  });

  it('expands Proposal Stage and renders 5-point blueprint upon click', async () => {
    await renderComponent();

    const proposalBtn = container.querySelector('[data-testid="toggle-proposal-stage"]');
    await act(async () => {
      proposalBtn.click();
    });

    expect(proposalBtn.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Problem Statement');
    expect(container.textContent).toContain(
      'Smallholder highland farmers lose substantial crop yields.',
    );
    expect(container.textContent).toContain('Proposed Solution');
    expect(container.textContent).toContain(
      'An on-premise ESP32-CAM and Raspberry Pi edge-node pipeline.',
    );
    expect(container.textContent).toContain('Unique Innovation');
    expect(container.textContent).toContain('Target Beneficiaries');
    expect(container.textContent).toContain('Expected Impact / Value');
    expect(container.textContent).toContain('SDG 2');
    expect(container.textContent).toContain('Artificial Intelligence');
  });

  it('expands Manuscript section and shows Chapters 1-3 cards for students', async () => {
    await renderComponent({ isStudent: true });

    const manuscriptBtn = container.querySelector('[data-testid="toggle-manuscript-section"]');
    await act(async () => {
      manuscriptBtn.click();
    });

    expect(manuscriptBtn.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Chapter 1: Problem Definition & Objectives');
    expect(container.textContent).toContain('Chapter 2: Literature Review & Methodology');
    expect(container.textContent).toContain('Chapter 3: System Architecture & Specifications');
    expect(container.textContent).toContain('Compiled Chapters 1–3 Proposal Manuscript');
  });

  it('expands ADM section and renders ActionDoneMatrixTab scoped to CAPSTONE_1', async () => {
    await renderComponent();

    const admBtn = container.querySelector('[data-testid="toggle-adm-section"]');
    await act(async () => {
      admBtn.click();
    });

    expect(admBtn.getAttribute('aria-expanded')).toBe('true');
    const admTab = container.querySelector('[data-testid="mock-adm-tab"]');
    expect(admTab).toBeTruthy();
    expect(admTab.getAttribute('data-milestone')).toBe('CAPSTONE_1');
  });

  it('expands Defense Evaluation & Grade Sign-Off section and renders EvaluationPanel', async () => {
    await renderComponent();

    const evalBtn = container.querySelector('[data-testid="toggle-evaluation-section"]');
    await act(async () => {
      evalBtn.click();
    });

    expect(evalBtn.getAttribute('aria-expanded')).toBe('true');
    const evalPanel = container.querySelector('[data-testid="mock-evaluation-panel"]');
    expect(evalPanel).toBeTruthy();
    expect(evalPanel.getAttribute('data-defensetype')).toBe('proposal');
  });
});
