import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CapstoneWorkflowStepper, {
  resolveCurrentStep,
  CAPSTONE_STEPS,
} from './CapstoneWorkflowStepper';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('CapstoneWorkflowStepper Component', () => {
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
      root.unmount();
    });
    container.remove();
  });

  it('renders all 5 standardized capstone milestone nodes', async () => {
    await act(async () => {
      root.render(<CapstoneWorkflowStepper currentStep={2} />);
    });

    expect(container.textContent).toContain('Team Formation');
    expect(container.textContent).toContain('Title Proposal');
    expect(container.textContent).toContain('Capstone 1');
    expect(container.textContent).toContain('Capstone 2');
    expect(container.textContent).toContain('Capstone 3');

    expect(container.textContent).toContain('Phase 0');
    expect(container.textContent).toContain('Proposal');
    expect(container.textContent).toContain('Phase 1');
    expect(container.textContent).toContain('Phase 2');
    expect(container.textContent).toContain('Phase 3');
  });

  it('correctly resolves active currentStep from project metadata across 5 stages', () => {
    // Archived / Defended -> Step 4
    expect(resolveCurrentStep({ projectStatus: 'defended' })).toBe(4);
    expect(resolveCurrentStep({ isArchived: true })).toBe(4);

    // Phase 3 (Final & Archival) -> Step 4
    expect(resolveCurrentStep({ capstonePhase: 3 })).toBe(4);

    // Phase 2 (System Dev) -> Step 3
    expect(resolveCurrentStep({ capstonePhase: 2 })).toBe(3);

    // Phase 1 (Title approved) -> Step 2
    expect(resolveCurrentStep({ capstonePhase: 1, titleStatus: 'approved' })).toBe(2);
    expect(resolveCurrentStep({ titleStatus: 'approved' })).toBe(2);

    // Title Proposal (Draft or Submitted or Revision) -> Step 1
    expect(resolveCurrentStep({ titleStatus: 'submitted' })).toBe(1);
    expect(resolveCurrentStep({ titleStatus: 'draft' })).toBe(1);
    expect(resolveCurrentStep({ titleProposals: [{ title: 'Smart City' }] })).toBe(1);

    // Default Phase 0 -> Step 0
    expect(resolveCurrentStep({})).toBe(0);
    expect(resolveCurrentStep(null)).toBe(0);
  });

  it('triggers onStepClick callback when a milestone card is clicked', async () => {
    const handleStepClick = vi.fn();
    await act(async () => {
      root.render(<CapstoneWorkflowStepper currentStep={1} onStepClick={handleStepClick} />);
    });

    const clickableDiv = container.querySelector('[role="button"]');
    expect(clickableDiv).toBeTruthy();

    await act(async () => {
      clickableDiv.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(handleStepClick).toHaveBeenCalled();
  });

  it('renders integrated pending proposal deliberation banner and candidate proposals when submitted', async () => {
    const mockProject = {
      _id: 'proj-123',
      titleStatus: 'submitted',
      titleProposals: [
        { title: 'Smart Disaster Management System' },
        { title: 'Autonomous Traffic Monitor' },
      ],
    };

    await act(async () => {
      root.render(<CapstoneWorkflowStepper project={mockProject} />);
    });

    expect(container.textContent).toContain('Pending Proposal Deliberation');
    expect(container.textContent).toContain('Candidate Proposals Under Review (2)');
    expect(container.textContent).toContain('Smart Disaster Management System');
    expect(container.textContent).toContain('Autonomous Traffic Monitor');
    expect(container.textContent).toContain('Open Title Approval Studio');
    expect(container.textContent).toContain(
      'Chapter submissions and Capstone 1 milestones unlock once your proposal title is approved.',
    );
  });

  it('renders committee assignment pending strip when title is approved but panel is not yet assigned', async () => {
    const mockProject = {
      _id: 'proj-123',
      titleStatus: 'approved',
      panelistIds: [],
    };

    await act(async () => {
      root.render(<CapstoneWorkflowStepper project={mockProject} />);
    });

    expect(container.textContent).toContain('Title Approved — Committee Assignment Pending');
    expect(container.textContent).toContain(
      'Waiting for the course instructor to assign defense panelists',
    );
  });

  it('renders merged executive project title header card when project metadata is provided', async () => {
    const mockProject = {
      _id: 'proj-456',
      title: 'AI Smart Campus Navigation and Facility Asset Management System',
      titleStatus: 'approved',
      capstonePhase: 2,
      projectStatus: 'active',
      academicYear: '2025-2026',
      teamId: { name: 'Team Alpha', section: '4A' },
      adviserId: { fullName: 'Dr. Jane Smith' },
    };

    await act(async () => {
      root.render(<CapstoneWorkflowStepper project={mockProject} />);
    });

    expect(container.textContent).toContain(
      'AI Smart Campus Navigation and Facility Asset Management System',
    );
    expect(container.textContent).toContain('Team Alpha');
    expect(container.textContent).toContain('AY 2025-2026');
    expect(container.textContent).toContain('Section 4A');
    expect(container.textContent).toContain('Dr. Jane Smith');
    expect(container.textContent).toContain('Proposals & Rehearsal');
    expect(container.textContent).toContain('Capstone Milestone Progression');
  });

  it('invokes onSelectProposal when candidate proposal button is clicked', async () => {
    const onSelectProposal = vi.fn();
    const mockProject = {
      _id: 'proj-789',
      titleStatus: 'submitted',
      titleProposals: [
        { title: 'AgriSense: Edge-AI Microclimate' },
        { title: 'ResQMesh: Decentralized LoRa' },
      ],
    };

    await act(async () => {
      root.render(
        <CapstoneWorkflowStepper project={mockProject} onSelectProposal={onSelectProposal} />,
      );
    });

    const proposalButton = Array.from(container.querySelectorAll('button')).find((btn) =>
      btn.textContent?.includes('ResQMesh: Decentralized LoRa'),
    );
    expect(proposalButton).toBeTruthy();

    await act(async () => {
      proposalButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelectProposal).toHaveBeenCalledWith(1);
  });
});
