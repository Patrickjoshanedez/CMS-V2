import React, { act } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import ProposalCompilationPage from './ProposalCompilationPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      _id: 'user-std-1',
      role: 'student',
      fullName: 'Megumi Josh Fushiguro',
    },
    fetchUser: vi.fn(),
  }),
}));

const mockProjectData = {
  _id: 'proj-123',
  title:
    'AgroSense AI: A Federated Learning Framework for Hyper-Local Crop Disease Prediction via Edge IoT',
  academicYear: '2025-2026',
  titleStatus: 'approved',
  projectStatus: 'pending_for_submission',
  capstonePhase: 3,
  capstoneType: 'Capstone 3',
  abstract: 'A federated learning framework for crop disease detection.',
  sdgTags: ['SDG 2: Zero Hunger', 'SDG 9: Industry, Innovation and Infrastructure'],
  teamId: 'team-solo-1',
  team: { name: 'Team Solo Leveling' },
};

vi.mock('@/hooks/useProjects', () => ({
  useMyProject: () => ({
    data: mockProjectData,
    isLoading: false,
    error: null,
  }),
}));

const mockSubmissionsList = [
  { _id: 'sub-1', type: 'chapter', chapter: 1, version: 1, status: 'approved' },
  { _id: 'sub-2', type: 'chapter', chapter: 2, version: 1, status: 'approved' },
  { _id: 'sub-3', type: 'chapter', chapter: 3, version: 1, status: 'approved' },
];

const mockCompileMutate = vi.fn();

vi.mock('@/hooks/useSubmissions', () => ({
  useProjectSubmissions: () => ({
    data: { submissions: mockSubmissionsList },
    isLoading: false,
    error: null,
  }),
  useCompileProposal: () => ({
    mutate: mockCompileMutate,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ProposalCompilationPage UI consistency', () => {
  let container = null;
  let root = null;

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
    container = null;
  });

  it('renders project identity and standardized status badges without raw enum underscores', async () => {
    await act(async () => {
      root.render(<ProposalCompilationPage />);
    });

    // Academic Year
    expect(container.textContent).toContain('2025-2026');

    // Title status badge should show "Approved"
    expect(container.textContent).toContain('Approved');

    // Project status badge should show "Pending for Submission" and NOT raw "pending_for_submission"
    expect(container.textContent).toContain('Pending for Submission');
    expect(container.textContent).not.toContain('pending_for_submission');

    // Project title
    expect(container.textContent).toContain('AgroSense AI');

    // Defensive prefix normalization for team name: displays "Team Solo Leveling", not duplicate "Team Team"
    expect(container.textContent).toContain('Team Solo Leveling');
    expect(container.textContent).not.toContain('Team Team');
  });

  it('renders chapter-by-chapter readiness breakdown for Chapters 1-3', async () => {
    await act(async () => {
      root.render(<ProposalCompilationPage />);
    });

    // Required Manuscript Chapters (1–3) section
    expect(container.textContent).toContain('Required Manuscript Chapters (1–3)');
    expect(container.textContent).toContain('Chapter 1');
    expect(container.textContent).toContain('Chapter 2');
    expect(container.textContent).toContain('Chapter 3');
    expect(container.textContent).toContain('Round v1');

    // All 3 chapters are approved
    expect(container.textContent).toContain('Chapters 1-3 Ready');
  });

  it('displays the interactive drag-and-drop dropzone when no file is selected', async () => {
    await act(async () => {
      root.render(<ProposalCompilationPage />);
    });

    expect(container.textContent).toContain(
      'Click to browse or drag and drop your compiled proposal document',
    );
    expect(container.textContent).toContain('PDF, DOCX, or DOC up to 25 MB');

    const fileInput = container.querySelector('#proposal-file');
    expect(fileInput).not.toBeNull();
    expect(fileInput.type).toBe('file');
  });

  it('displays file preview card and enable submit when valid file is selected', async () => {
    await act(async () => {
      root.render(<ProposalCompilationPage />);
    });

    const fileInput = container.querySelector('#proposal-file');
    const dummyFile = new File(['dummy proposal content'], 'AgroSense_Compiled_Proposal_v1.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    await act(async () => {
      Object.defineProperty(fileInput, 'files', {
        value: [dummyFile],
        writable: true,
      });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // File card should appear
    expect(container.textContent).toContain('AgroSense_Compiled_Proposal_v1.docx');
    expect(container.textContent).toContain('Word Document');
    expect(container.textContent).toContain('Ready to Compile');

    // Remove button should exist
    const removeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Remove'),
    );
    expect(removeBtn).toBeDefined();

    // Clicking remove clears the file
    await act(async () => {
      removeBtn.click();
    });

    expect(container.textContent).toContain(
      'Click to browse or drag and drop your compiled proposal document',
    );
  });
});
