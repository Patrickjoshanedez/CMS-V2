import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import SimilarProjectModal from './SimilarProjectModal';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('SimilarProjectModal component', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
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

  const renderModal = (props = {}) => {
    const defaultProps = {
      project: null,
      onClose: vi.fn(),
      portal: false,
      ...props,
    };

    act(() => {
      root.render(<SimilarProjectModal {...defaultProps} />);
    });

    return {
      props: defaultProps,
      unmount: () => {
        act(() => {
          root.render(null);
        });
      },
    };
  };

  it('renders nothing when project is null', () => {
    const { unmount } = renderModal({ project: null });
    expect(container.querySelector('[data-testid="similar-project-modal"]')).toBeNull();
    unmount();
  });

  it('renders proposal stage layout with 6 pitch deck sections and stage badge', () => {
    const proposalProject = {
      id: 'prop-123',
      title: 'AgriNode: IoT-Driven Microclimate Telemetry',
      similarityScore: 100,
      capstonePhase: 1,
      academicYear: '2024–2025',
      problemStatement: 'Farmers face increasing vulnerability to sudden microclimate shifts.',
      proposedSolution: 'Solar-powered mesh sensor nodes with LoRa telemetry.',
      uniqueContribution: 'Localized edge AI predictive model for crop disease warning.',
      targetUsers: 'Highland Vegetable Farmers in Bukidnon',
      expectedImpact: '40% reduction in crop loss and 25% water optimization.',
      capstoneType: ['Embedded Systems & IoT'],
      sdgTags: ['SDG 2: Zero Hunger', 'SDG 13: Climate Action'],
    };

    const onClose = vi.fn();
    const { unmount } = renderModal({ project: proposalProject, onClose });

    const modal = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('100% Title Match');
    expect(modal.textContent).toContain('Capstone 1: Proposal Stage');
    expect(modal.textContent).toContain('Problem Statement & Literature Gap');
    expect(modal.textContent).toContain(
      'Farmers face increasing vulnerability to sudden microclimate shifts.',
    );
    expect(modal.textContent).toContain('Proposed Solution & Technical Framework');
    expect(modal.textContent).toContain('Solar-powered mesh sensor nodes with LoRa telemetry.');
    expect(modal.textContent).toContain('Unique Technical Innovation');
    expect(modal.textContent).toContain(
      'Localized edge AI predictive model for crop disease warning.',
    );
    expect(modal.textContent).toContain('Highland Vegetable Farmers in Bukidnon');
    expect(modal.textContent).toContain('40% reduction in crop loss');
    expect(modal.textContent).toContain('Embedded Systems & IoT');
    expect(modal.textContent).toContain('SDG 2: Zero Hunger');
    expect(modal.textContent).toContain('SDG 13: Climate Action');
    expect(modal.textContent).toContain('View Project');

    unmount();
  });

  it('renders archived manuscript layout with abstract and implemented tech stack', () => {
    const archivedProject = {
      id: 'arch-456',
      title: 'BukSU Automated Library System',
      similarityScore: 82,
      projectStatus: 'archived',
      academicYear: '2022–2023',
      abstract: 'A full-stack automated library catalogue and borrowing kiosk system.',
      targetBeneficiary: 'University Library',
      techStack: ['React', 'Node.js', 'PostgreSQL'],
    };

    const onClose = vi.fn();
    const { unmount } = renderModal({ project: archivedProject, onClose });

    const modal = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('82% Title Match');
    expect(modal.textContent).toContain('Archived Manuscript');
    expect(modal.textContent).toContain('Abstract / Project Summary');
    expect(modal.textContent).toContain('A full-stack automated library catalogue');
    expect(modal.textContent).toContain('Implemented Tech Stack');
    expect(modal.textContent).toContain('PostgreSQL');
    expect(modal.textContent).toContain('View in Archive');

    unmount();
  });

  it('handles Escape key to trigger onClose', () => {
    const onClose = vi.fn();
    const { unmount } = renderModal({
      project: { id: 'test-1', title: 'Test Project', similarityScore: 70 },
      onClose,
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(onClose).toHaveBeenCalled();
    unmount();
  });

  it('handles null, 0, or undefined capstonePhase safely without crashing and resolves correct default stage badge', () => {
    // Case A: null phase with abstract -> Archived Manuscript
    const projectWithAbstract = {
      id: 'p-abstract',
      title: 'Distributed File Ledger System',
      similarityScore: 78,
      capstonePhase: null,
      abstract: 'A decentralized ledger architecture for academic document storage.',
    };

    const { unmount: unmountA } = renderModal({ project: projectWithAbstract });
    const modalA = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modalA.textContent).toContain('Archived Manuscript');
    expect(modalA.textContent).toContain('Abstract / Project Summary');
    unmountA();

    // Case B: null phase without abstract -> Capstone 1: Proposal Stage
    const projectWithoutAbstract = {
      id: 'p-no-abstract',
      title: 'Smart Campus Shuttle Tracker',
      similarityScore: 72,
      capstonePhase: null,
      problemStatement: 'Students wait without real-time tracking of university shuttles.',
    };

    const { unmount: unmountB } = renderModal({ project: projectWithoutAbstract });
    const modalB = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modalB.textContent).toContain('Capstone 1: Proposal Stage');
    expect(modalB.textContent).toContain('Problem Statement & Literature Gap');
    unmountB();

    // Case C: 0 phase without abstract -> Capstone 1: Proposal Stage
    const projectPhaseZero = {
      id: 'p-zero',
      title: 'AI Lab Access Management System',
      similarityScore: 80,
      capstonePhase: 0,
      problemStatement: 'Manual logbooks for AI lab entry cause tracking latency.',
    };

    const { unmount: unmountC } = renderModal({ project: projectPhaseZero });
    const modalC = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modalC.textContent).toContain('Capstone 1: Proposal Stage');
    unmountC();
  });

  it('enforces modal content precedence when both abstract and pitch fields exist', () => {
    // Proposal (Phase 1): Pitch deck format takes precedence
    const proposalWithBoth = {
      id: 'prop-both',
      title: 'IoT Forest Fire Early Detection',
      similarityScore: 90,
      capstonePhase: 1,
      abstract: 'General overview abstract draft.',
      problemStatement: 'Wildfires in Mount Kitanglad cause severe ecological damage.',
      proposedSolution: 'Thermal imaging LoRa sensor towers.',
      techStack: ['Python', 'LoRaWAN', 'Raspberry Pi'],
    };

    const { unmount: unmountProp } = renderModal({ project: proposalWithBoth });
    const modalProp = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modalProp.textContent).toContain('Capstone 1: Proposal Stage');
    expect(modalProp.textContent).toContain('Problem Statement & Literature Gap');
    expect(modalProp.textContent).toContain(
      'Wildfires in Mount Kitanglad cause severe ecological damage.',
    );
    expect(modalProp.textContent).toContain('Proposed Solution & Technical Framework');
    expect(modalProp.textContent).toContain('Proposed Tech Stack');
    expect(modalProp.textContent).toContain('LoRaWAN');
    unmountProp();

    // Post-Defense (Phase 3): Formal Academic Abstract takes precedence
    const progressWithBoth = {
      id: 'prog-both',
      title: 'IoT Forest Fire Early Detection System (Completed)',
      similarityScore: 90,
      capstonePhase: 3,
      abstract: 'Official academic manuscript abstract for progress defense.',
      problemStatement: 'Early draft problem statement.',
      techStack: ['Python', 'LoRaWAN'],
    };

    const { unmount: unmountProg } = renderModal({ project: progressWithBoth });
    const modalProg = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modalProg.textContent).toContain('Capstone 3: Progress Defense');
    expect(modalProg.textContent).toContain('Abstract / Project Summary');
    expect(modalProg.textContent).toContain(
      'Official academic manuscript abstract for progress defense.',
    );
    expect(modalProg.textContent).toContain('Implemented Tech Stack');
    unmountProg();
  });

  it('terminal archival status strictly supersedes capstonePhase === 1', () => {
    const archivedProposal = {
      id: 'arch-prop-1',
      title: 'Archived Legacy Proposal Record',
      similarityScore: 85,
      projectStatus: 'archived',
      capstonePhase: 1,
      abstract: 'Archived historical capstone abstract.',
    };

    const { unmount } = renderModal({ project: archivedProposal });
    const modal = container.querySelector('[data-testid="similar-project-modal"]');
    expect(modal.textContent).toContain('Archived Manuscript');
    expect(modal.textContent).toContain('View in Archive');
    unmount();
  });
});
