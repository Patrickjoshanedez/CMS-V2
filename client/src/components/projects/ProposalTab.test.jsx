import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProposalTab from './ProposalTab';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockGenerateProposalDeck = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock('@/services/authService', () => ({
  projectService: {
    generateProposalDeck: (...args) => mockGenerateProposalDeck(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccess(...args),
    error: (...args) => toastError(...args),
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

const fieldText = {
  problemStatement:
    'High prevalence of manual incident logs and delayed routing leads to unresolved requests and poor visibility.',
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
  'Explain how your system solves the problem, core features...',
  'What makes this different from existing tools? Campus DB-linked, cost-effective...',
  'Primary and secondary users...',
  'Efficiency, transparency, academic integrity...',
];

const renderProposalTab = (project = baseProject) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<ProposalTab project={project} />);
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

  it('keeps only one accordion expanded at a time', () => {
    const view = renderProposalTab();

    expect(view.container.textContent).toContain('Tracks incidents and response workflows');

    const secondAccordionButton = Array.from(view.container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Barangay Escalation Dashboard'),
    );

    expect(secondAccordionButton).toBeTruthy();

    act(() => {
      secondAccordionButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(view.container.textContent).toContain('Supports escalation pipelines and incident analytics.');
    expect(view.container.textContent).not.toContain('Tracks incidents and response workflows');

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
    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
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

    expect(storedDraft).toEqual({
      problemStatement: values[0],
      proposedSolution: values[1],
      uniqueContribution: values[2],
      targetUsers: values[3],
      expectedImpact: values[4],
    });
    expect(toastSuccess).toHaveBeenCalledWith('Proposal draft saved locally.');

    view.unmount();
  });

  it('submits deck data and triggers a sanitized PDF download filename', async () => {
    vi.useFakeTimers();
    mockGenerateProposalDeck.mockResolvedValue({ data: new Uint8Array([1, 2, 3]) });

    const view = renderProposalTab();

    const originalCreateElement = document.createElement.bind(document);
    const linkClick = vi.fn();
    const linkRemove = vi.fn();

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
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
    expect(textareas).toHaveLength(5);

    const valueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
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
        proposedSolution: values[1],
        uniqueContribution: values[2],
        targetUsers: values[3],
        expectedImpact: values[4],
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
