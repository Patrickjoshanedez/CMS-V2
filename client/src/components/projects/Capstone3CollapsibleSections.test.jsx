import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Capstone3CollapsibleSections from './Capstone3CollapsibleSections';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useSubmissions', () => ({
  useProjectSubmissions: () => ({
    data: [
      { _id: 'sub-4', chapterNumber: 4, type: 'chapter', version: 1, status: 'approved' },
      { _id: 'sub-5', chapterNumber: 5, type: 'chapter', version: 1, status: 'approved' },
      {
        _id: 'sub-paper',
        type: 'final_academic',
        version: 1,
        status: 'approved',
        fileName: 'Manuscript_Full.pdf',
        createdAt: new Date().toISOString(),
      },
      {
        _id: 'sub-journal',
        type: 'final_journal',
        version: 1,
        status: 'pending',
        fileName: 'Journal_Article.pdf',
        createdAt: new Date().toISOString(),
      },
    ],
  }),
}));

vi.mock('@/components/submissions/ChapterReviewPanel', () => ({
  default: ({ chapters, extraItems }) => (
    <div
      data-testid="mock-chapter-review-panel"
      data-chapters={chapters.join(',')}
      data-extra={extraItems?.map((e) => e.label).join(',')}
    >
      Chapter Review Panel ({chapters.join(',')})
      {extraItems?.map((e) => (
        <span key={e.id} data-testid="extra-item-label">
          {e.label}
        </span>
      ))}
    </div>
  ),
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

vi.mock('@/components/documents/SophisticatedDocumentViewer', () => ({
  default: ({ open, submission }) =>
    open ? <div data-testid="mock-doc-viewer">Viewer: {submission?._id}</div> : null,
}));

const mockProject = {
  _id: 'proj-103',
  title: 'Smart Precision Agriculture System',
  actionDoneMatrix: [
    {
      _id: 'adm-3',
      milestone: 'CAPSTONE_3',
      panelRecommendation: 'Verify sensor calibration results in Chapter 4',
      actionTaken: 'Updated Table 4.2 with variance metrics',
      status: 'verified',
    },
  ],
  admStatus: 'submitted',
  admSignatures: {
    secretary: { endorsed: true },
  },
};

describe('Capstone3CollapsibleSections Component Suite', () => {
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
        <Capstone3CollapsibleSections
          project={mockProject}
          isFaculty
          user={{ role: 'faculty', _id: 'u-faculty' }}
          {...props}
        />,
      );
    });
  };

  it('renders all 4 section headers in compact, organized format', async () => {
    await renderComponent();

    expect(container.textContent).toContain('Chapters 4–5 & Final Manuscript Submissions');
    expect(container.textContent).toContain('Academic Paper & Academic Journal');
    expect(container.textContent).toContain('Action Done Matrix (ADM v3)');
    expect(container.textContent).toContain('Final Oral Defense Evaluation & Grade Sign-Off');
  });

  it('does NOT render the removed Image 2 card or citations', async () => {
    await renderComponent();

    expect(container.textContent).not.toContain('Official Full Manuscript Paper');
    expect(container.textContent).not.toContain('[APA 7th]:');
    expect(container.textContent).not.toContain('[IEEE]:');
    expect(container.textContent).not.toContain('Conferred Capstone Study');
  });

  it('renders ChapterReviewPanel in section 1 strictly with Chapters 4 and 5 without extra items', async () => {
    await renderComponent();

    const panel = container.querySelector('[data-testid="mock-chapter-review-panel"]');
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('data-chapters')).toBe('4,5');
    expect(panel.getAttribute('data-extra')).toBeNull();
  });

  it('toggles Publications section and renders Academic Paper and Academic Journal cards', async () => {
    await renderComponent();

    const togglePubBtn = container.querySelector('[data-testid="toggle-publications-section"]');
    await act(async () => {
      togglePubBtn.click();
    });

    expect(container.textContent).toContain('Academic Paper');
    expect(container.textContent).toContain('Manuscript_Full.pdf');
    expect(container.textContent).toContain('Academic Journal');
    expect(container.textContent).toContain('Journal_Article.pdf');
  });

  it('toggles ADM section and mounts ActionDoneMatrixTab with initialMilestone="CAPSTONE_3"', async () => {
    await renderComponent();

    expect(container.querySelector('[data-testid="mock-adm-tab"]')).toBeNull();

    const toggleAdmBtn = container.querySelector('[data-testid="toggle-adm-section"]');
    await act(async () => {
      toggleAdmBtn.click();
    });

    const admTab = container.querySelector('[data-testid="mock-adm-tab"]');
    expect(admTab).toBeTruthy();
    expect(admTab.getAttribute('data-milestone')).toBe('CAPSTONE_3');
  });

  it('toggles Evaluation section and mounts EvaluationPanel with defenseType="final"', async () => {
    await renderComponent();

    expect(container.querySelector('[data-testid="mock-evaluation-panel"]')).toBeNull();

    const toggleEvalBtn = container.querySelector('[data-testid="toggle-evaluation-section"]');
    await act(async () => {
      toggleEvalBtn.click();
    });

    const evalPanel = container.querySelector('[data-testid="mock-evaluation-panel"]');
    expect(evalPanel).toBeTruthy();
    expect(evalPanel.getAttribute('data-defensetype')).toBe('final');
  });
});
