import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Capstone1CollapsibleSections from './Capstone1CollapsibleSections';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    error: (...args) => mockToastError(...args),
    success: (...args) => mockToastSuccess(...args),
  },
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

const mockApproveTitleMutate = vi.fn().mockResolvedValue({});
const mockRejectTitleMutate = vi.fn().mockResolvedValue({});
const mockAddTitleCommentMutate = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useProjects', () => ({
  useApproveTitle: () => ({ mutateAsync: mockApproveTitleMutate, isPending: false }),
  useRejectTitle: () => ({ mutateAsync: mockRejectTitleMutate, isPending: false }),
  useAddTitleComment: () => ({ mutateAsync: mockAddTitleCommentMutate, isPending: false }),
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

vi.mock('@/components/defense/ScheduleDefenseModal', () => ({
  default: ({ isOpen, onClose }) =>
    isOpen ? (
      <div data-testid="mock-schedule-defense-modal">
        Schedule Defense Modal
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
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

  it('hides student drafting and rehearsal buttons and shows reviewer controls when isStudent is false', async () => {
    const pendingProject = {
      ...mockProject,
      titleStatus: 'pending',
    };

    await renderComponent({
      project: pendingProject,
      isStudent: false,
      user: { _id: 'inst-1', role: 'instructor' },
    });

    const proposalBtn = container.querySelector('[data-testid="toggle-proposal-stage"]');
    await act(async () => {
      proposalBtn.click();
    });

    expect(proposalBtn.getAttribute('aria-expanded')).toBe('true');
    // Student authoring buttons must NOT be rendered
    expect(container.textContent).not.toContain('Rehearse Pitch Deck');
    expect(container.textContent).not.toContain('Drafting Studio');

    // Reviewer Deliberation Decision Studio should be rendered
    expect(container.textContent).toContain('Committee Deliberation & Official Decision');
    expect(container.textContent).toContain('Approve Proposal as Official Title');
    expect(container.textContent).toContain('Request Revisions from Proponents');
    expect(container.textContent).toContain('Submit Official Decision');
  });

  it('shows student drafting and rehearsal buttons when isStudent is true', async () => {
    await renderComponent({ isStudent: true });

    const proposalBtn = container.querySelector('[data-testid="toggle-proposal-stage"]');
    await act(async () => {
      proposalBtn.click();
    });

    expect(container.textContent).toContain('Rehearse Pitch Deck');
  });

  it('blocks approval and notifies error toast if defense hearing is not scheduled', async () => {
    const unscheduledProject = {
      ...mockProject,
      titleStatus: 'pending',
      defenseSchedule: null,
    };

    await renderComponent({
      project: unscheduledProject,
      isStudent: false,
      user: { _id: 'inst-1', role: 'instructor' },
    });

    const proposalBtn = container.querySelector('[data-testid="toggle-proposal-stage"]');
    await act(async () => {
      proposalBtn.click();
    });

    const approveBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Approve Proposal as Official Title'),
    );
    expect(approveBtn).toBeTruthy();
    await act(async () => {
      approveBtn.click();
    });

    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Submit Official Decision'),
    );
    expect(submitBtn).toBeTruthy();

    await act(async () => {
      submitBtn.click();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      'The proponent team must have a scheduled defense hearing before their title proposal can be approved. Please schedule the team in the Scheduling Center.',
    );
    // Should also automatically pop the ScheduleDefenseModal for instructor convenience
    expect(container.querySelector('[data-testid="mock-schedule-defense-modal"]')).toBeTruthy();
  });

  it('approves proposal and passes selectedProposalIndex (0-based) when defense hearing is scheduled', async () => {
    const scheduledProject = {
      ...mockProject,
      titleStatus: 'submitted',
      defenseSchedule: {
        status: 'scheduled',
        date: new Date('2026-10-20'),
        time: '09:00 AM - 10:00 AM',
        venue: 'COT Conference Room',
      },
    };

    await renderComponent({
      project: scheduledProject,
      isStudent: false,
      user: { _id: 'inst-1', role: 'instructor' },
    });

    const proposalBtn = container.querySelector('[data-testid="toggle-proposal-stage"]');
    await act(async () => {
      proposalBtn.click();
    });

    expect(container.textContent).toContain('Defense Hearing Scheduled:');

    const approveBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Approve Proposal as Official Title'),
    );
    await act(async () => {
      approveBtn.click();
    });

    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Submit Official Decision'),
    );
    await act(async () => {
      submitBtn.click();
    });

    expect(mockApproveTitleMutate).toHaveBeenCalledWith({
      projectId: scheduledProject._id,
      proposalId: 0,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining('officially approved as capstone title'),
    );
  });

  it('allows instructor to open ScheduleDefenseModal via inline button when unscheduled', async () => {
    const unscheduledProject = {
      ...mockProject,
      titleStatus: 'submitted',
      defenseSchedule: null,
    };

    await renderComponent({
      project: unscheduledProject,
      isStudent: false,
      user: { _id: 'inst-1', role: 'instructor' },
    });

    const proposalBtn = container.querySelector('[data-testid="toggle-proposal-stage"]');
    await act(async () => {
      proposalBtn.click();
    });

    const scheduleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Schedule Defense Hearing'),
    );
    expect(scheduleBtn).toBeTruthy();

    await act(async () => {
      scheduleBtn.click();
    });

    expect(container.querySelector('[data-testid="mock-schedule-defense-modal"]')).toBeTruthy();
  });

  it('allows instructor to submit revision request with remarks and proposalId', async () => {
    const scheduledProject = {
      ...mockProject,
      titleStatus: 'revision_required',
      defenseSchedule: {
        status: 'scheduled',
        date: '2026-10-15T09:00:00.000Z',
        time: '09:00 AM - 10:00 AM',
        venue: 'COT AVR 1',
      },
    };

    await renderComponent({
      project: scheduledProject,
      isStudent: false,
      user: { _id: 'inst-1', role: 'instructor' },
    });

    const proposalBtn = container.querySelector('[data-testid="toggle-proposal-stage"]');
    await act(async () => {
      proposalBtn.click();
    });

    const revisionBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Request Revisions from Proponents'),
    );
    expect(revisionBtn).toBeTruthy();

    await act(async () => {
      revisionBtn.click();
    });

    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      ).set;
      valueSetter.call(textarea, 'Please revise scope and title wording.');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Submit Official Decision'),
    );
    await act(async () => {
      submitBtn.click();
    });

    expect(mockRejectTitleMutate).toHaveBeenCalledWith({
      projectId: scheduledProject._id,
      reason: 'Proposal Revision Required: Please revise scope and title wording.',
      proposalId: 0,
    });
    expect(mockToastSuccess).toHaveBeenCalledWith('Title proposal sent back for revision.');
  });
});
