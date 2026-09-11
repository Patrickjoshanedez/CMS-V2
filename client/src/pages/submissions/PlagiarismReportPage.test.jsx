import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import PlagiarismReportPage from './PlagiarismReportPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-router-dom', () => ({
  useParams: () => ({ submissionId: 'sub-test-123' }),
  useNavigate: () => vi.fn(),
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
  default: ({ open, onOpenChange }) =>
    open ? <div data-testid="sophisticated-document-viewer">Document Viewer Modal</div> : null,
  DocxPreviewRenderer: () => <div data-testid="docx-preview-renderer">Docx Embedded Preview</div>,
}));

vi.mock('@/components/documents/PaginatedDocumentViewer', () => ({
  default: () => <div data-testid="docx-preview-renderer">Paginated Document Preview</div>,
}));

const mockScanMutate = vi.fn();
vi.mock('../../hooks/useSubmissions', () => ({
  usePlagiarismReport: () => ({
    data: {
      overallScore: 18,
      originalityScore: 82,
      originalText:
        'Modern agricultural monitoring systems enable precision irrigation and crop optimization.',
      textMatches: [
        {
          sourceId: 'src-1',
          sourceTitle: 'BukSU Precision Agriculture Study 2025',
          similarityPercentage: 18,
          matchedBlocks: [
            {
              studentStart: 0,
              studentEnd: 45,
              matchedText: 'Modern agricultural monitoring systems enable',
              sourceText: 'Modern agricultural monitoring systems enable high accuracy sensors.',
            },
          ],
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
  useSubmission: () => ({
    data: {
      _id: 'sub-test-123',
      fileName: 'SmartFarming_Manuscript.docx',
      capstonePhase: 2,
    },
    isLoading: false,
  }),
  useScanSubmissionArchive: () => ({
    mutate: mockScanMutate,
    isPending: false,
  }),
}));

describe('PlagiarismReportPage', () => {
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

  it('renders report header, KPI cards, and originality scores', () => {
    act(() => {
      root.render(<PlagiarismReportPage />);
    });

    expect(container.textContent).toContain('Plagiarism & Similarity Intelligence Report');
    expect(container.textContent).toContain('SmartFarming_Manuscript.docx');
    expect(container.textContent).toContain('Passes BukSU Standard');
    expect(container.textContent).toContain('18%');
    expect(container.textContent).toContain('82%');
    expect(container.textContent).toContain('BukSU Precision Agriculture Study 2025');
  });

  it('renders extracted document text with Turnitin-style highlighted marks', () => {
    act(() => {
      root.render(<PlagiarismReportPage />);
    });

    const mark = container.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark.textContent).toContain('Modern agricultural monitoring systems enable');
  });

  it('opens SophisticatedDocumentViewer when clicking Inspect in Reader', () => {
    act(() => {
      root.render(<PlagiarismReportPage />);
    });

    expect(container.querySelector('[data-testid="sophisticated-document-viewer"]')).toBeNull();

    const inspectBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Inspect in Reader'),
    );
    expect(inspectBtn).toBeDefined();

    act(() => {
      inspectBtn.click();
    });

    expect(container.querySelector('[data-testid="sophisticated-document-viewer"]')).not.toBeNull();
  });

  it('triggers re-scan mutation when clicking Re-scan Archive', () => {
    act(() => {
      root.render(<PlagiarismReportPage />);
    });

    const rescanBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Re-scan Archive'),
    );
    expect(rescanBtn).toBeDefined();

    act(() => {
      rescanBtn.click();
    });

    expect(mockScanMutate).toHaveBeenCalledWith('sub-test-123', expect.any(Object));
  });

  it('allows toggling originality highlights on and off in formatted manuscript view', () => {
    act(() => {
      root.render(<PlagiarismReportPage />);
    });

    const toggleBtn = container.querySelector('[data-testid="toggle-highlights-btn"]');
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.textContent).toContain('Highlights: ON');

    act(() => {
      toggleBtn.click();
    });

    expect(toggleBtn.textContent).toContain('Highlights: OFF');

    act(() => {
      toggleBtn.click();
    });

    expect(toggleBtn.textContent).toContain('Highlights: ON');
  });

  it('allows toggling between Paper Sheet and Theme styles', () => {
    act(() => {
      root.render(<PlagiarismReportPage />);
    });

    const article = container.querySelector('article');
    expect(article).not.toBeNull();
    expect(article.className).toContain('bg-white');

    const themeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Theme'),
    );
    expect(themeBtn).toBeDefined();

    act(() => {
      themeBtn.click();
    });

    expect(article.className).toContain('bg-card');

    const paperBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Paper Sheet'),
    );
    expect(paperBtn).toBeDefined();

    act(() => {
      paperBtn.click();
    });

    expect(article.className).toContain('bg-white');
  });

  it('formats academic cover page elements with centered typography and eliminates excessive voids', () => {
    const academicText =
      '<Title of Capstone Project>\n\n\n\n\n\n\n\n\nA Capstone Project by\n\n\n\n<Name 1>\n<Name 2>\n\n\nSubmitted to the Information Technology Department, College of Technologies\nBukidnon State University\n\nIn Partial Fulfillment\nof the Requirements for the Degree\n<Degree>\n\nCHAPTER 1\nINTRODUCTION\nModern agricultural monitoring systems enable precision irrigation.';

    act(() => {
      root.render(
        <PlagiarismReportPage
          originalText={academicText}
          reportData={{
            overallScore: 10,
            originalityScore: 90,
            extractedText: academicText,
            textMatches: [],
          }}
        />,
      );
    });

    const article = container.querySelector('article');
    expect(article).not.toBeNull();

    const titleHeading = article.querySelector('h1');
    expect(titleHeading).not.toBeNull();
    expect(titleHeading.textContent).toBe('<Title of Capstone Project>');
    expect(titleHeading.className).toContain('text-center');

    const chapterHeading = article.querySelector('h2');
    expect(chapterHeading).not.toBeNull();
    expect(chapterHeading.textContent).toBe('CHAPTER 1');
    expect(chapterHeading.className).toContain('text-center');

    expect(container.textContent).toContain('A Capstone Project by');
    expect(container.textContent).toContain('<Name 1>');
    expect(container.textContent).toContain('<Name 2>');
    expect(container.textContent).toContain('Bukidnon State University');
  });
});
