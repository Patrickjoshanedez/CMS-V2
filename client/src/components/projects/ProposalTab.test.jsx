import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProposalTab from './ProposalTab';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockGenerateProposalDeck = vi.fn();
const mockReviseAndResubmit = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastInfo = vi.fn();

vi.mock('@/services/authService', () => ({
  projectService: {
    generateProposalDeck: (...args) => mockGenerateProposalDeck(...args),
    reviseAndResubmit: (...args) => mockReviseAndResubmit(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccess(...args),
    error: (...args) => toastError(...args),
    info: (...args) => toastInfo(...args),
  },
}));

const baseProject = {
  _id: 'project-1',
  titleProposals: [
    { _id: 'proposal-1', title: 'Smart Incident Tracker: BukSU' },
    { _id: 'proposal-2', title: 'Barangay Escalation Dashboard' },
  ],
  titleProposalMetadata: [
    {
      title: 'Smart Incident Tracker: BukSU',
      description: 'Tracks incidents and response workflows for student and faculty teams.',
    },
    {
      title: 'Barangay Escalation Dashboard',
      description: 'Supports escalation pipelines and incident analytics.',
    },
  ],
};

const structuredDescriptionProject = {
  _id: 'project-structured',
  titleProposals: [{ _id: 'proposal-structured-1', title: 'LexiBridge Rural Literacy Assistant' }],
  titleProposalMetadata: [
    {
      title: 'LexiBridge Rural Literacy Assistant',
      description:
        'Problem Statement: Administrative, legal, and medical documents are difficult for low-literacy and non-native readers. Objectives: Rewrite documents into simple language and dialect-ready variants. Technical Stack: Mobile OCR, a language model, and offline storage. Proposed Solution: A mobile OCR plus LLM app that rewrites documents into simple language and dialect-ready variants. Unique Contribution / Innovation: Focuses on cognitive accessibility and supports offline mode for low-connectivity regions. Target Users / Beneficiaries: Rural community members, elderly citizens, and non-native speakers navigating government systems. Expected Impact / Value: Improves autonomy, lowers administrative errors, and increases access to healthcare and legal services.',
    },
  ],
};

const approvedProject = {
  ...baseProject,
  titleStatus: 'approved',
  projectStatus: 'proposal_approved',
  capstonePhase: 2,
};

const fieldText = {
  problemStatement:
    'High prevalence of manual incident logs and delayed routing leads to unresolved requests and poor visibility.',
  objectives: 'Measure response time, routing accuracy, and the completeness of incident records.',
  technicalStack: 'React dashboard, Express API, and a MongoDB incident store.',
  proposedSolution:
    'A centralized tracker that maps incident categories, owners, and timeline alerts for faster resolution.',
  uniqueContribution:
    'Combines workflow-specific rubric checkpoints with localized reporting suitable for campus operations.',
  targetUsers:
    'Primary users are student teams and advisers while panelists consume milestone and readiness snapshots.',
  expectedImpact:
    'Improves turnaround time, accountability, and project governance while reducing repetitive status coordination.',
};

const placeholders = [
  'Describe the high prevalence of the issue, existing gaps, and current costs...',
  'List the specific objectives the capstone will achieve...',
  'List the languages, frameworks, platforms, and hardware...',
  'Explain how your system solves the problem, core features...',
  'What makes this different from existing tools? Campus DB-linked, cost-effective...',
  'Primary and secondary users...',
  'Efficiency, transparency, academic integrity...',
];

const renderProposalTab = (project = baseProject, props = {}) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<ProposalTab project={project} {...props} />);
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

describe('ProposalTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:proposal-pdf');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('renders empty state when no proposals are available', () => {
    const view = renderProposalTab({ titleProposals: [] });

    expect(view.container.textContent).toContain('No title proposals found for this project yet.');

    view.unmount();
  });

  it('switches between proposals through the accessible tab list', () => {
    const view = renderProposalTab();

    expect(view.container.querySelector('textarea#proposal-1-problemStatement')).toBeTruthy();
    expect(view.container.querySelector('textarea#proposal-2-problemStatement')).toBeFalsy();
    expect(view.container.querySelector('[role="tablist"]')).toBeTruthy();
    expect(
      view.container.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
    ).toContain('Smart Incident Tracker: BukSU');

    const secondProposalTab = Array.from(view.container.querySelectorAll('[role="tab"]')).find(
      (tab) => tab.textContent?.includes('Barangay Escalation Dashboard'),
    );

    expect(secondProposalTab).toBeTruthy();

    act(() => {
      secondProposalTab.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      secondProposalTab.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(view.container.querySelector('textarea#proposal-2-problemStatement')).toBeTruthy();
    expect(view.container.querySelector('textarea#proposal-1-problemStatement')).toBeFalsy();
    expect(
      view.container.querySelector('[role="tab"][aria-selected="true"]')?.textContent,
    ).toContain('Barangay Escalation Dashboard');

    view.unmount();
  });

  it('validates required fields and does not call API with incomplete deck data', async () => {
    const view = renderProposalTab();

    const generateButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Generate Presentation Deck'),
    );

    expect(generateButton).toBeTruthy();

    await act(async () => {
      generateButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(toastError).toHaveBeenCalledWith(
      'Please complete all pitch deck sections before generating the PDF.',
    );
    expect(mockGenerateProposalDeck).not.toHaveBeenCalled();

    view.unmount();
  });

  it('saves the current proposal draft locally when requested', async () => {
    const view = renderProposalTab();

    const textareas = view.container.querySelectorAll('textarea');
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    ).set;
    const values = Object.values(fieldText);

    for (let index = 0; index < textareas.length; index += 1) {
      await act(async () => {
        valueSetter.call(textareas[index], values[index]);
        textareas[index].dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    const saveButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Save Draft'),
    );

    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const storedDraft = JSON.parse(
      window.localStorage.getItem('cms:proposal-draft:project-1:proposal-1'),
    );

    expect(storedDraft).toEqual(fieldText);
    expect(toastSuccess).toHaveBeenCalledWith('Proposal draft saved locally.');

    view.unmount();
  });

  it('hydrates textarea fields from persisted proposal description metadata', () => {
    const view = renderProposalTab(structuredDescriptionProject);

    const textareas = view.container.querySelectorAll('textarea');
    expect(textareas).toHaveLength(7);

    const valuesByField = Object.fromEntries(
      Array.from(textareas, (textarea) => [textarea.id.split('-').at(-1), textarea.value]),
    );

    expect(valuesByField.problemStatement).toContain(
      'difficult for low-literacy and non-native readers',
    );
    expect(valuesByField.objectives).toContain('Rewrite documents into simple language');
    expect(valuesByField.technicalStack).toContain(
      'Mobile OCR, a language model, and offline storage',
    );
    expect(valuesByField.proposedSolution).toContain('mobile OCR plus LLM app');
    expect(valuesByField.uniqueContribution).toContain(
      'cognitive accessibility and supports offline mode',
    );
    expect(valuesByField.targetUsers).toContain('Rural community members, elderly citizens');
    expect(valuesByField.expectedImpact).toContain(
      'Improves autonomy, lowers administrative errors',
    );

    view.unmount();
  });

  it('shows approval and capstone progress context for approved projects', () => {
    const view = renderProposalTab(approvedProject);

    expect(view.container.textContent).toMatch(
      /Title approved\. (Current progress:|Project progress is now at) Capstone 2\./,
    );
    expect(view.container.textContent).toContain('Approved');
    expect(view.container.textContent).toContain('Proposal Approved');

    view.unmount();
  });

  it('requires an accessible confirmation before unlocking the approved scope', async () => {
    const view = renderProposalTab(approvedProject);
    const textarea = view.container.querySelector('textarea#proposal-1-problemStatement');

    expect(textarea.disabled).toBe(true);

    const unlockButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Unlock to Edit Scope'),
    );

    await act(async () => unlockButton.click());

    const dialog = document.body.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain('may require committee re-evaluation');
    expect(textarea.disabled).toBe(true);

    const confirmButton = Array.from(dialog.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Unlock scope'),
    );

    await act(async () => confirmButton.click());

    expect(view.container.querySelector('textarea#proposal-1-problemStatement').disabled).toBe(
      false,
    );
    expect(toastInfo).toHaveBeenCalledWith(
      'Proposal scope unlocked for editing. Modifications will be tracked.',
    );

    view.unmount();
  });

  it('resubmits a revision through the project service and refreshes the project', async () => {
    mockReviseAndResubmit.mockResolvedValue({});
    const onRefresh = vi.fn();
    const view = renderProposalTab(
      { ...baseProject, titleStatus: 'revision_required' },
      { onRefresh },
    );
    const submitButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Confirm Revision & Resubmit for Committee Review'),
    );

    await act(async () => submitButton.click());

    expect(mockReviseAndResubmit).toHaveBeenCalledWith(
      'project-1',
      expect.objectContaining({
        proposalId: 'proposal-1',
        title: 'Smart Incident Tracker: BukSU',
        pitchDeck: expect.objectContaining({
          problemStatement:
            'Tracks incidents and response workflows for student and faculty teams.',
        }),
      }),
    );
    expect(onRefresh).toHaveBeenCalledOnce();
    expect(toastSuccess).toHaveBeenCalledWith(
      'Revised proposal resubmitted! Committee and instructors have been notified.',
    );

    view.unmount();
  });

  it('submits deck data and triggers a sanitized PDF download filename', async () => {
    vi.useFakeTimers();
    mockGenerateProposalDeck.mockResolvedValue({ data: new Uint8Array([1, 2, 3]) });

    const view = renderProposalTab();

    const originalCreateElement = document.createElement.bind(document);
    const linkClick = vi.fn();
    const linkRemove = vi.fn();

    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName, options) => {
        const element = originalCreateElement(tagName, options);
        if (tagName === 'a') {
          element.click = linkClick;
          Object.defineProperty(element, 'remove', {
            value: linkRemove,
            configurable: true,
          });
        }
        return element;
      });

    for (const placeholder of placeholders) {
      const textarea = view.container.querySelector(`textarea[placeholder="${placeholder}"]`);
      expect(textarea).toBeTruthy();

      await act(async () => {
        const valueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value',
        ).set;
        valueSetter.call(textarea, fieldText.problemStatement);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    const textareas = view.container.querySelectorAll('textarea');
    expect(textareas).toHaveLength(7);

    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    ).set;
    const values = Object.values(fieldText);
    for (let index = 0; index < textareas.length; index += 1) {
      await act(async () => {
        valueSetter.call(textareas[index], values[index]);
        textareas[index].dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    const generateButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Generate Presentation Deck'),
    );

    await act(async () => {
      generateButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockGenerateProposalDeck).toHaveBeenCalledTimes(1);
    expect(mockGenerateProposalDeck).toHaveBeenCalledWith({
      projectId: 'project-1',
      proposalId: 'proposal-1',
      title: 'Smart Incident Tracker: BukSU',
      deckData: {
        problemStatement: values[0],
        objectives: values[1],
        technicalStack: values[2],
        proposedSolution: values[3],
        uniqueContribution: values[4],
        targetUsers: values[5],
        expectedImpact: values[6],
      },
    });

    const generatedAnchor = createElementSpy.mock.results
      .map((entry) => entry.value)
      .find((element) => element.tagName === 'A');

    expect(generatedAnchor).toBeTruthy();
    expect(generatedAnchor.download).toBe('Smart_Incident_Tracker_BukSU_PitchDeck.pdf');
    expect(linkClick).toHaveBeenCalledTimes(1);
    expect(linkRemove).toHaveBeenCalledTimes(1);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:proposal-pdf');
    expect(toastSuccess).toHaveBeenCalledWith('Pitch deck generated successfully.');

    createElementSpy.mockRestore();
    vi.useRealTimers();
    view.unmount();
  });
});
