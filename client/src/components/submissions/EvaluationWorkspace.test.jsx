import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import EvaluationWorkspace, { StickyVerdictBar } from './EvaluationWorkspace';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('./PdfViewerWorkspace', () => ({
  default: ({
    highlights,
    plagiarismMatches,
    layerFilter,
    commentsOpacity,
    plagiarismOpacity,
    onAddToAdm,
  }) => (
    <div
      data-testid="mock-pdf-viewer-workspace"
      data-filter={layerFilter}
      data-comments-opacity={String(commentsOpacity ?? 80)}
      data-plag-opacity={String(plagiarismOpacity ?? 80)}
      data-highlights-count={String(highlights?.length ?? 0)}
      data-plag-count={String(plagiarismMatches?.length ?? 0)}
    >
      Mock PDF Viewer Workspace
      <button
        data-testid="mock-add-adm-btn"
        type="button"
        onClick={() =>
          onAddToAdm?.({
            pageNumbers: '3',
            flaggedQuote: 'Plagiarized paragraph from prior thesis',
            suggestion: 'Properly cite original work or rephrase.',
            expectedAction: 'Properly cite original work or rephrase.',
          })
        }
      >
        Trigger Add ADM
      </button>
    </div>
  ),
}));

describe('EvaluationWorkspace', () => {
  let container;
  let root;

  const mockHighlights = [
    {
      id: 'h1',
      type: 'faculty_comment',
      position: {
        pageNumber: 1,
        boundingRect: { x1: 0, y1: 0, x2: 100, y2: 20, width: 100, height: 20 },
      },
      meta: { authorName: 'Dr. Santos', status: 'open' },
      comment: { text: 'Clarify system requirements' },
    },
  ];

  const mockPlagiarismMatches = [
    {
      sourceId: 'src-1',
      suspectText: 'Sample flagged text',
      similarityScore: 42,
      isExact: false,
    },
  ];

  beforeEach(() => {
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

  it('renders split-screen evaluation workspace with PDF canvas and right tabbed drawer', () => {
    act(() => {
      root.render(
        <EvaluationWorkspace
          submission={{ _id: 'sub-1', title: 'Smart Farm IoT' }}
          pdfUrl="https://example.com/test.pdf"
          highlights={mockHighlights}
          plagiarismMatches={mockPlagiarismMatches}
        />,
      );
    });

    const pdfViewer = container.querySelector('[data-testid="mock-pdf-viewer-workspace"]');
    expect(pdfViewer).not.toBeNull();
    expect(pdfViewer.getAttribute('data-filter')).toBe('all');
    expect(pdfViewer.getAttribute('data-highlights-count')).toBe('1');
    expect(pdfViewer.getAttribute('data-plag-count')).toBe('1');

    // Right tabs
    expect(container.textContent).toContain('Rubric Scorecard');
    expect(container.textContent).toContain('Action Done Matrix');
    expect(container.textContent).toContain('Sources');
  });

  it('updates layer filter state when layer buttons are clicked', () => {
    act(() => {
      root.render(
        <EvaluationWorkspace
          submission={{ _id: 'sub-1' }}
          pdfUrl="https://example.com/test.pdf"
          highlights={mockHighlights}
          plagiarismMatches={mockPlagiarismMatches}
        />,
      );
    });

    const commentsBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Comments'),
    );
    expect(commentsBtn).toBeDefined();

    act(() => {
      commentsBtn.click();
    });

    const pdfViewer = container.querySelector('[data-testid="mock-pdf-viewer-workspace"]');
    expect(pdfViewer.getAttribute('data-filter')).toBe('comments');
  });

  it('toggles opacity controls and passes custom opacities to PdfViewerWorkspace', () => {
    act(() => {
      root.render(
        <EvaluationWorkspace
          submission={{ _id: 'sub-1' }}
          pdfUrl="https://example.com/test.pdf"
          highlights={mockHighlights}
        />,
      );
    });

    const opacityBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Opacity'),
    );
    expect(opacityBtn).toBeDefined();

    act(() => {
      opacityBtn.click();
    });

    // Check sliders appear
    expect(container.textContent).toContain('Overlay Opacity');
    const rangeInputs = container.querySelectorAll('input[type="range"]');
    expect(rangeInputs.length).toBe(2);

    // Initial opacity is 80%
    const pdfViewer = container.querySelector('[data-testid="mock-pdf-viewer-workspace"]');
    expect(pdfViewer.getAttribute('data-comments-opacity')).toBe('80');
    expect(pdfViewer.getAttribute('data-plag-opacity')).toBe('80');
  });

  it('handles one-click Add to ADM directive optimistically', async () => {
    const handleAddToAdm = vi.fn().mockResolvedValue({ success: true });

    act(() => {
      root.render(
        <EvaluationWorkspace
          submission={{ _id: 'sub-1' }}
          pdfUrl="https://example.com/test.pdf"
          onAddToAdm={handleAddToAdm}
        />,
      );
    });

    const addAdmBtn = container.querySelector('[data-testid="mock-add-adm-btn"]');
    expect(addAdmBtn).not.toBeNull();

    await act(async () => {
      addAdmBtn.click();
    });

    // Switches to ADM tab and displays directive
    expect(container.textContent).toContain('Action Done Matrix');
    expect(container.textContent).toContain('Properly cite original work or rephrase.');
    expect(handleAddToAdm).toHaveBeenCalledWith(
      expect.objectContaining({
        pageNumbers: '3',
        suggestion: 'Properly cite original work or rephrase.',
      }),
    );
  });

  it('renders print-only defense evaluation summary appendix with institutional details', () => {
    act(() => {
      root.render(
        <EvaluationWorkspace
          submission={{
            _id: 'sub-1',
            title: 'Automated Agro-Climate Sentinel',
            teamId: { name: 'Team Alpha' },
            stage: 'CAPSTONE_2',
          }}
          pdfUrl="https://example.com/test.pdf"
          highlights={mockHighlights}
          admItems={[
            {
              _id: 'adm-1',
              pageNumber: 2,
              commentText: 'Missing citation for YOLOv8 model',
              expectedAction: 'Add reference IEEE citation',
              status: 'pending',
            },
          ]}
        />,
      );
    });

    const printSection = container.querySelector('[data-print-only="true"]');
    expect(printSection).not.toBeNull();
    expect(printSection.textContent).toContain('Bukidnon State University');
    expect(printSection.textContent).toContain(
      'Defense Manuscript Evaluation & Action Done Matrix (ADM) Appendix',
    );
    expect(printSection.textContent).toContain('Automated Agro-Climate Sentinel');
    expect(printSection.textContent).toContain('Team Alpha');
    expect(printSection.textContent).toContain('Panel Chair Signature');
    expect(printSection.textContent).toContain('Secretary Compliance Seal');
  });

  it('dispatches defense verdict actions from sticky verdict bar', () => {
    const handleVerdict = vi.fn();

    act(() => {
      root.render(
        <StickyVerdictBar
          submissionId="sub-1"
          canSubmitVerdict={true}
          onVerdict={handleVerdict}
          verdictScore={88}
        />,
      );
    });

    expect(container.textContent).toContain('Score: 88%');

    const approveBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent.includes('Approve Submission') || b.textContent.includes('Approve'),
    );
    expect(approveBtn).toBeDefined();

    act(() => {
      approveBtn.click();
    });

    expect(handleVerdict).toHaveBeenCalledWith('approved');
  });
});
