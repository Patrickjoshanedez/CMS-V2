import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import SubmissionReviewPage from './SubmissionReviewPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-router-dom', () => ({
  useParams: () => ({ submissionId: 'sub-review-test-123' }),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ search: '' }),
  Link: ({ children, to, ...props }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/documents/SophisticatedDocumentViewer', () => ({
  default: ({ open, embedded, submission, fileUrl, highlights, plagiarismMatches }) =>
    open || embedded ? (
      <div
        data-testid="sophisticated-document-viewer"
        data-embedded={String(!!embedded)}
        data-url={fileUrl}
        data-highlights-count={String(highlights?.length ?? 0)}
        data-plagiarism-count={String(plagiarismMatches?.length ?? 0)}
      >
        Sophisticated Viewer: {submission?.fileName} (v{submission?.version})
      </div>
    ) : null,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) =>
    selector({
      user: {
        _id: 'user-faculty-1',
        name: 'Dr. Faculty Member',
        role: 'faculty',
      },
    }),
}));

const mockScanArchiveMutate = vi.fn();
const mockWorkspaceData = {
  submission: {
    _id: 'sub-review-test-123',
    projectId: 'proj-101',
    chapter: 'chapter1',
    status: 'needs_revision',
    fileName: 'Chapter_1_Manuscript_v2.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSizeBytes: 204800,
    textExtracted: 'Chapter 1: Introduction and Project Background for Smart Agro-Tech.',
    submittedBy: {
      _id: 'student-1',
      name: 'Maria Santos',
    },
    createdAt: '2026-03-01T08:00:00.000Z',
  },
  project: {
    _id: 'proj-101',
    title: 'Smart Agro-Tech: IoT Monitoring System',
    adviser: 'user-faculty-1',
    teamId: 'team-101',
  },
  rounds: [
    {
      roundNumber: 1,
      label: 'Round 1',
      sourceSubmissionId: 'sub-review-test-100',
      reviewStatus: 'needs_revision',
      submissionDate: '2026-02-15T08:00:00.000Z',
      feedback: 'Please address research methodology comments.',
      syncedGoogleDocUrl: 'https://docs.google.com/document/d/doc-round-1/edit',
      originalityScore: 85,
    },
    {
      roundNumber: 2,
      label: 'Round 2',
      sourceSubmissionId: 'sub-review-test-123',
      reviewStatus: 'pending',
      submissionDate: '2026-03-01T08:00:00.000Z',
      feedback: '',
      syncedGoogleDocUrl: 'https://docs.google.com/document/d/doc-round-2/edit',
      originalityScore: 100,
    },
  ],
  adviserId: 'user-faculty-1',
  annotations: [],
  reviewStatus: 'pending',
  canReview: true,
  isAdviser: true,
  teamResources: {
    googleDocUrl: 'https://docs.google.com/document/d/team-main-doc/edit',
  },
};

let currentWorkspaceData = mockWorkspaceData;

vi.mock('@/hooks/useSubmissions', () => ({
  useSubmissionReviewWorkspace: () => ({
    data: currentWorkspaceData,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useViewUrl: () => ({
    data: { url: '/api/submissions/sub-review-test-123/file' },
    isLoading: false,
  }),
  useReviewSubmission: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useMarkSubmissionAccepted: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useRequestRevisionRound: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useAddAnnotation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useAddAnnotationReply: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useGoogleDocComments: () => ({
    data: null,
    isLoading: false,
  }),
  usePlagiarismReport: () => ({
    data: {
      overallScore: 0,
      originalityScore: 100,
      sourcesCount: 0,
      textMatches: [],
    },
    isLoading: false,
  }),
  useScanSubmissionArchive: () => ({
    mutate: mockScanArchiveMutate,
    isPending: false,
  }),
  useSubmissionComments: () => ({
    data: [],
    isLoading: false,
    refetch: vi.fn(),
  }),
  useCreateSubmissionComment: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useAddCommentReply: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateCommentStatus: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

describe('SubmissionReviewPage', () => {
  let container;
  let root;

  beforeEach(() => {
    currentWorkspaceData = mockWorkspaceData;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.clearAllMocks();
  });

  it('renders correctly and defaults to the latest revision round (Round 2)', () => {
    act(() => {
      root.render(<SubmissionReviewPage />);
    });

    // Check round selector has Round 2 selected
    const activeRoundBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Revision 1') || b.textContent.includes('Round 2'),
    );
    expect(activeRoundBtn).toBeDefined();

    // Check embedded SophisticatedDocumentViewer is rendered for manuscript reading
    const embeddedViewer = container.querySelector('[data-testid="sophisticated-document-viewer"]');
    expect(embeddedViewer).not.toBeNull();
    expect(embeddedViewer.getAttribute('data-embedded')).toBe('true');
  });

  it('correctly displays 100% originality as emerald green Compliant with BukSU standard', () => {
    act(() => {
      root.render(<SubmissionReviewPage />);
    });

    const bodyText = container.textContent;
    expect(bodyText).toContain('100%');
    expect(bodyText).toContain('Compliant — Passes BukSU Standard');
    expect(bodyText).toContain('0% similarity');

    // Dead unstyled PlagiarismChecker should NOT be rendered
    expect(bodyText).not.toContain('🔍 Plagiarism Analysis');
    expect(bodyText).not.toContain('Expand Originality: 100.0%');
  });

  it('renders accessible links to the Team Google Doc', () => {
    act(() => {
      root.render(<SubmissionReviewPage />);
    });

    const googleDocLinks = Array.from(container.querySelectorAll('a')).filter(
      (a) => a.href && a.href.includes('docs.google.com'),
    );
    expect(googleDocLinks.length).toBeGreaterThan(0);
    expect(googleDocLinks.some((a) => a.textContent.includes('Google Doc'))).toBe(true);
  });

  it('unlocks decision-making authority and actions when reviewing as assigned adviser', () => {
    act(() => {
      root.render(<SubmissionReviewPage />);
    });

    const bodyText = container.textContent;
    // Reviewer identity should display Adviser
    expect(bodyText).toContain('Reviewing as');
    expect(bodyText).toContain('Adviser');

    // Restriction message should not be present
    expect(bodyText).not.toContain(
      'Decision actions are available to advisers and course instructors only.',
    );

    // Decision textarea should be active with proper placeholder
    const textarea = container.querySelector('#overallNotes');
    expect(textarea).not.toBeNull();
    expect(textarea.disabled).toBe(false);
    expect(textarea.placeholder).toContain('Write your feedback or decision rationale');

    // Decision buttons should be enabled (only Approve Round and Request Revision)
    const buttons = Array.from(container.querySelectorAll('button'));
    const approveBtn = buttons.find((b) => b.textContent.includes('Approve Round'));
    const reviseBtn = buttons.find((b) => b.textContent.includes('Request Revision'));
    const acceptBtn = buttons.find((b) => b.textContent.includes('Accept & Lock'));

    expect(approveBtn).toBeDefined();
    expect(approveBtn.disabled).toBe(false);

    expect(reviseBtn).toBeDefined();
    expect(reviseBtn.disabled).toBe(false);

    // Accept & Lock button has been cleanly removed
    expect(acceptBtn).toBeUndefined();
  });

  it('disables decision actions and displays authority warning when viewing as non-adviser faculty', () => {
    currentWorkspaceData = {
      ...mockWorkspaceData,
      adviserId: 'other-adviser-999',
      project: {
        ...mockWorkspaceData.project,
        adviser: 'other-adviser-999',
      },
    };

    act(() => {
      root.render(<SubmissionReviewPage />);
    });

    const bodyText = container.textContent;
    expect(bodyText).toContain(
      'Decision actions are available to advisers and course instructors only.',
    );

    const textarea = container.querySelector('#overallNotes');
    expect(textarea).not.toBeNull();
    expect(textarea.disabled).toBe(true);
    expect(textarea.placeholder).toBe(
      'You do not have decision-making authority for this project.',
    );

    const buttons = Array.from(container.querySelectorAll('button'));
    const approveBtn = buttons.find((b) => b.textContent.includes('Approve Round'));
    const reviseBtn = buttons.find((b) => b.textContent.includes('Request Revision'));
    const acceptBtn = buttons.find((b) => b.textContent.includes('Accept & Lock'));

    expect(approveBtn.disabled).toBe(true);
    expect(reviseBtn.disabled).toBe(true);
    expect(acceptBtn).toBeUndefined();
  });

  it('renders embedded SophisticatedDocumentViewer with multi-layer annotation props', () => {
    act(() => {
      root.render(<SubmissionReviewPage />);
    });

    const viewer = container.querySelector('[data-testid="sophisticated-document-viewer"]');
    expect(viewer).not.toBeNull();
    expect(viewer.getAttribute('data-embedded')).toBe('true');
    expect(viewer.getAttribute('data-highlights-count')).toBe('0');
    expect(viewer.getAttribute('data-plagiarism-count')).toBe('0');
  });
});
