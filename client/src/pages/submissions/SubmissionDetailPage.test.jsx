import React, { act } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import SubmissionDetailPage from './SubmissionDetailPage';
import { getSubmissionDocumentTitle } from '@/utils/submissionUtils';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
let mockSubmissionId = 'sub-v1';
const mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ submissionId: mockSubmissionId }),
  useSearchParams: () => [mockSearchParams],
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/documents/SophisticatedDocumentViewer', () => ({
  default: () => <div data-testid="sophisticated-viewer">Document Viewer Mock</div>,
}));

vi.mock('@/components/submissions/PlagiarismChecker', () => ({
  default: () => <div data-testid="plagiarism-checker">Plagiarism Checker Mock</div>,
}));

let mockCurrentUser = {
  _id: 'student-1',
  role: 'student',
  teamId: 'team-1',
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => {
    const state = { user: mockCurrentUser };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

let mockSubmissionData = null;
let mockChapterHistoryData = [];
let mockProjectSubmissionsData = { submissions: [] };

const mockReviewMutate = vi.fn();
vi.mock('@/hooks/useSubmissions', () => ({
  useSubmission: () => ({
    data: mockSubmissionData,
    isLoading: false,
    error: null,
  }),
  useViewUrl: () => ({
    data: { url: 'https://mock.example.com/file.pdf' },
    isLoading: false,
  }),
  useChapterHistory: () => ({
    data: mockChapterHistoryData,
    isLoading: false,
  }),
  useProjectSubmissions: () => ({
    data: mockProjectSubmissionsData,
    isLoading: false,
  }),
  useReviewSubmission: (opts) => ({
    mutate: (...args) => {
      mockReviewMutate(...args);
      opts?.onSuccess?.({ success: true }, args[0]);
    },
    isPending: false,
  }),
  useUnlockSubmission: () => ({ mutate: vi.fn(), isPending: false }),
  useAddAnnotation: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveAnnotation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateJustification: () => ({ mutate: vi.fn(), isPending: false }),
  useScanSubmissionArchive: () => ({ mutate: vi.fn(), isPending: false }),
  useUploadChapter: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCompileProposal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadSystemDesign: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadTestResults: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadFinalAcademic: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUploadFinalJournal: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('SubmissionDetailPage Revision Suite', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = {
      _id: 'student-1',
      role: 'student',
      teamId: 'team-1',
    };
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

  it('renders without outdated alert when viewing the only or latest revision', async () => {
    mockSubmissionId = 'sub-v2';
    mockSubmissionData = {
      _id: 'sub-v2',
      chapter: 1,
      version: 2,
      status: 'accepted',
      projectId: 'proj-1',
      fileName: 'chapter1_v2.docx',
      fileSize: 50000,
      isLate: false,
    };
    mockChapterHistoryData = [
      { _id: 'sub-v2', version: 2, status: 'accepted' },
      { _id: 'sub-v1', version: 1, status: 'revisions_required' },
    ];

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    expect(container.textContent).toContain('Chapter 1 Manuscript');
    expect(container.textContent).toContain('v2');
    expect(container.textContent).not.toContain('Viewing Earlier Revision');
    expect(container.textContent).toContain('Revisions:');
    expect(container.textContent).toContain('On-Time');
    // Redundant standalone card should not be present
    expect(container.textContent).not.toContain('Locked (On-Time)');
  });

  it('renders prominent outdated alert and revision pills when viewing an earlier revision (v1)', async () => {
    mockSubmissionId = 'sub-v1';
    mockSubmissionData = {
      _id: 'sub-v1',
      chapter: 1,
      version: 1,
      status: 'revisions_required',
      projectId: 'proj-1',
      fileName: 'chapter1_v1.docx',
      fileSize: 45000,
      isLate: false,
    };
    mockChapterHistoryData = [
      { _id: 'sub-v2', version: 2, status: 'accepted' },
      { _id: 'sub-v1', version: 1, status: 'revisions_required' },
    ];

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    // Outdated version banner should be visible
    expect(container.textContent).toContain('Viewing Earlier Revision (v1)');
    expect(container.textContent).toContain(
      'A newer revision (v2) is available with status: accepted.',
    );

    // Click button to navigate to latest revision
    const viewLatestBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('View Latest Revision (v2)'),
    );
    expect(viewLatestBtn).toBeTruthy();

    await act(async () => {
      viewLatestBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/submissions/sub-v2');
  });

  it('renders only Approve and Request Revisions for faculty reviews (no Reject or Unlock button)', async () => {
    mockCurrentUser = {
      _id: 'faculty-1',
      role: 'instructor',
    };
    mockSubmissionId = 'sub-review-1';
    mockSubmissionData = {
      _id: 'sub-review-1',
      chapter: 2,
      version: 1,
      status: 'pending',
      projectId: 'proj-1',
      fileName: 'chapter2_v1.docx',
      fileSize: 62000,
      isLate: false,
    };
    mockChapterHistoryData = [{ _id: 'sub-review-1', version: 1, status: 'pending' }];

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    const buttons = Array.from(container.querySelectorAll('button')).map((b) =>
      b.textContent.trim(),
    );
    expect(buttons.some((text) => text.includes('Approve'))).toBe(true);
    expect(buttons.some((text) => text.includes('Request Revisions'))).toBe(true);
    expect(buttons.some((text) => text.includes('Reject'))).toBe(false);
    expect(buttons.some((text) => text.includes('Unlock Submission'))).toBe(false);
  });

  it('displays locked submissions as Approved with no unlock panel', async () => {
    mockCurrentUser = {
      _id: 'faculty-1',
      role: 'adviser',
    };
    mockSubmissionId = 'sub-locked-1';
    mockSubmissionData = {
      _id: 'sub-locked-1',
      chapter: 3,
      version: 1,
      status: 'locked',
      projectId: 'proj-1',
      fileName: 'chapter3_v1.docx',
      fileSize: 80000,
      isLate: false,
    };
    mockChapterHistoryData = [{ _id: 'sub-locked-1', version: 1, status: 'locked' }];

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    // Badge should say Approved
    expect(container.textContent).toContain('Approved');
    // Unlock card must NOT be present
    expect(container.textContent).not.toContain('Document Locked');
    expect(container.textContent).not.toContain('Unlock Submission');
  });

  it('formats document titles cleanly using getSubmissionDocumentTitle (never returns Chapter null)', () => {
    expect(getSubmissionDocumentTitle(null)).toBe('Submission Document');
    expect(getSubmissionDocumentTitle({ type: 'proposal' })).toBe('Chapter 1–3 Manuscript');
    expect(getSubmissionDocumentTitle({ type: 'proposal', chapter: null })).toBe(
      'Chapter 1–3 Manuscript',
    );
    expect(getSubmissionDocumentTitle({ type: 'system_design' })).toBe('System Design Document');
    expect(getSubmissionDocumentTitle({ type: 'test_results' })).toBe('Test Results Document');
    expect(getSubmissionDocumentTitle({ type: 'final_academic' })).toBe(
      'Final Academic Manuscript',
    );
    expect(getSubmissionDocumentTitle({ type: 'final_journal' })).toBe(
      'Publishable Journal Manuscript',
    );
    expect(getSubmissionDocumentTitle({ chapter: 2 })).toBe('Chapter 2 Manuscript');
    expect(getSubmissionDocumentTitle({ chapter: null })).toBe('Chapter 1–3 Manuscript');
  });

  it('renders Chapter 1–3 Manuscript instead of Chapter null for proposal compilation submissions', async () => {
    mockSubmissionId = 'sub-proposal-1';
    mockSubmissionData = {
      _id: 'sub-proposal-1',
      type: 'proposal',
      chapter: null,
      version: 1,
      status: 'pending',
      projectId: 'proj-1',
      fileName: 'Capstone-Proposal-Chapters-1-3.docx',
      fileSize: 312000,
      isLate: false,
    };
    mockChapterHistoryData = [];
    mockProjectSubmissionsData = {
      submissions: [mockSubmissionData],
    };

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    expect(container.textContent).toContain('Chapter 1–3 Manuscript');
    expect(container.textContent).not.toContain('Chapter null');
  });

  it('renders Revise Submission button for students and opens revision modal on click', async () => {
    mockCurrentUser = {
      _id: 'student-1',
      role: 'student',
      teamId: 'team-1',
    };
    mockSubmissionId = 'sub-proposal-1';
    mockSubmissionData = {
      _id: 'sub-proposal-1',
      type: 'proposal',
      chapter: null,
      version: 1,
      status: 'pending',
      projectId: 'proj-1',
      fileName: 'Wrong_File_Uploaded.docx',
      fileSize: 312000,
      isLate: false,
    };

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    // Revise button should be present in Action Toolbar and top header
    const reviseButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent.includes('Revise Submission'),
    );
    expect(reviseButtons.length).toBeGreaterThanOrEqual(1);

    // Click Revise button
    await act(async () => {
      reviseButtons[0].click();
    });

    // Modal dialog should be rendered into DOM
    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Revise Submission');
    expect(dialog.textContent).toContain(
      'Upload a replacement manuscript for Chapter 1–3 Manuscript',
    );
    expect(dialog.textContent).toContain('creates v2');
    expect(dialog.textContent).toContain('Word (.docx) or PDF manuscript up to 25 MB');
  });

  it('does NOT render Revise Submission button when submission is locked', async () => {
    mockCurrentUser = {
      _id: 'student-1',
      role: 'student',
      teamId: 'team-1',
    };
    mockSubmissionId = 'sub-locked-student';
    mockSubmissionData = {
      _id: 'sub-locked-student',
      chapter: 1,
      version: 1,
      status: 'locked',
      projectId: 'proj-1',
      fileName: 'chapter1_v1.docx',
      fileSize: 50000,
      isLate: false,
    };

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    const reviseButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent.includes('Revise Submission'),
    );
    expect(reviseButtons.length).toBe(0);
  });

  it('does NOT render the flagged for panel review incomplete institutional metadata alert', async () => {
    mockSubmissionId = 'sub-proposal-flagged';
    mockSubmissionData = {
      _id: 'sub-proposal-flagged',
      type: 'proposal',
      chapter: null,
      version: 1,
      status: 'pending',
      projectId: 'proj-1',
      fileName: 'Proposal_Draft.docx',
      fileSize: 312000,
      isLate: false,
      isFlagged: true,
      flagReasons: ['Missing proposal abstract or abstract is under 50 characters.'],
    };

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    expect(container.textContent).not.toContain('Flagged for Panel Review');
    expect(container.textContent).not.toContain('Incomplete Institutional Metadata');
  });

  it('renders Adviser Defense Readiness Check and allows endorsing proposal as ready for defense', async () => {
    mockCurrentUser = {
      _id: 'faculty-adviser-1',
      role: 'faculty',
    };
    mockSubmissionId = 'sub-proposal-adviser';
    mockSubmissionData = {
      _id: 'sub-proposal-adviser',
      type: 'proposal',
      chapter: null,
      version: 1,
      status: 'pending',
      projectId: 'proj-1',
      adviserId: 'faculty-adviser-1',
      isAssignedAdviser: true,
      fileName: 'Capstone-Proposal.docx',
      fileSize: 312000,
      isLate: false,
    };

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    expect(container.textContent).toContain('Adviser Defense Readiness Check');
    expect(container.textContent).toContain('Check & Endorse: Ready for Defense');

    const endorseBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Check & Endorse: Ready for Defense'),
    );
    expect(endorseBtn).toBeTruthy();

    await act(async () => {
      endorseBtn.click();
    });

    expect(mockReviewMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: 'sub-proposal-adviser',
        status: 'approved',
      }),
    );
  });

  it('renders Awaiting Adviser Defense Endorsement status card for students when proposal is pending', async () => {
    mockCurrentUser = {
      _id: 'student-1',
      role: 'student',
      teamId: 'team-1',
    };
    mockSubmissionId = 'sub-proposal-student';
    mockSubmissionData = {
      _id: 'sub-proposal-student',
      type: 'proposal',
      chapter: null,
      version: 1,
      status: 'pending',
      projectId: 'proj-1',
      fileName: 'Capstone-Proposal.docx',
      fileSize: 312000,
      isLate: false,
    };

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    expect(container.textContent).toContain('Awaiting Adviser Defense Endorsement');
    expect(container.textContent).toContain(
      'Once your adviser or course instructor checks and endorses this submission, your team will be officially signaled as Ready for Defense',
    );
  });

  it('renders Adviser Endorsement Confirmed: Ready for Defense when proposal is approved', async () => {
    mockCurrentUser = {
      _id: 'student-1',
      role: 'student',
      teamId: 'team-1',
    };
    mockSubmissionId = 'sub-proposal-approved';
    mockSubmissionData = {
      _id: 'sub-proposal-approved',
      type: 'proposal',
      chapter: null,
      version: 1,
      status: 'approved',
      projectId: 'proj-1',
      fileName: 'Capstone-Proposal.docx',
      fileSize: 312000,
      isLate: false,
      reviewNote: 'Well done! Chapters 1-3 are complete and ready for defense.',
      defenseSchedule: { status: 'pending_scheduling' },
    };

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    expect(container.textContent).toContain('Adviser Endorsement Confirmed: Ready for Defense');
    expect(container.textContent).toContain('Defense Ready');
    expect(container.textContent).toContain(
      'Well done! Chapters 1-3 are complete and ready for defense.',
    );
  });

  it('renders Defense Hearing Pending — Committee Preview Mode for defense panelist (cannot endorse)', async () => {
    mockCurrentUser = {
      _id: 'panelist-1',
      role: 'panelist',
      teamId: null,
    };
    mockSubmissionId = 'sub-proposal-panelist';
    mockSubmissionData = {
      _id: 'sub-proposal-panelist',
      type: 'proposal',
      chapter: null,
      version: 1,
      status: 'pending',
      projectId: 'proj-1',
      adviserId: 'adviser-99', // Not panelist-1
      isAssignedAdviser: false,
      fileName: 'Capstone-Proposal.docx',
      fileSize: 312000,
      isLate: false,
    };

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    // Panelist sees Preview Mode banner
    expect(container.textContent).toContain('Defense Hearing Pending — Committee Preview Mode');
    expect(container.textContent).toContain('Preview Mode');
    expect(container.textContent).toContain(
      'Only the assigned Adviser and Course Instructor can endorse this manuscript for defense scheduling.',
    );
    // Decision action buttons must NOT be present for panelist
    expect(container.textContent).not.toContain('Check & Endorse: Ready for Defense');
    expect(container.textContent).not.toContain('Request Manuscript Revisions');
  });

  it('renders Instructor Defense Readiness Check with endorsement authority for Course Instructor', async () => {
    mockCurrentUser = {
      _id: 'instructor-1',
      role: 'instructor',
      teamId: null,
    };
    mockSubmissionId = 'sub-proposal-instructor';
    mockSubmissionData = {
      _id: 'sub-proposal-instructor',
      type: 'proposal',
      chapter: null,
      version: 1,
      status: 'pending',
      projectId: 'proj-1',
      adviserId: 'adviser-99',
      isAssignedAdviser: false,
      fileName: 'Capstone-Proposal.docx',
      fileSize: 312000,
      isLate: false,
    };

    await act(async () => {
      root.render(<SubmissionDetailPage />);
    });

    expect(container.textContent).toContain('Instructor Defense Readiness Check');
    expect(container.textContent).toContain('Instructor Authority');
    expect(container.textContent).toContain('Check & Endorse: Ready for Defense');
    expect(container.textContent).toContain('Request Manuscript Revisions');
  });
});
