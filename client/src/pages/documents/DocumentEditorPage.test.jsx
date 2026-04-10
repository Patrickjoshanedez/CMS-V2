import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ROLES, DOCUMENT_TYPES } from '@cms/shared';
import DocumentEditorPage from './DocumentEditorPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseParams = vi.fn();
const mockUseNavigate = vi.fn();
const mockUseAuthStore = vi.fn();
const mockUseManuscriptOpenLink = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => mockUseNavigate(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('@/hooks/useDocuments', () => ({
  useManuscriptOpenLink: (...args) => mockUseManuscriptOpenLink(...args),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/documents/GoogleDocViewer', () => ({
  default: ({ embedUrl, title, canEdit }) => (
    <div data-testid="google-doc-viewer">
      <span>{embedUrl}</span>
      <span>{title}</span>
      <span>{canEdit ? 'editable' : 'view-only'}</span>
    </div>
  ),
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/Alert', () => ({
  Alert: ({ children }) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }) => <span>{children}</span>,
}));

vi.mock('lucide-react', () => ({
  Loader2: () => <span>loading-icon</span>,
  ArrowLeft: () => <span>arrow-left-icon</span>,
  AlertCircle: () => <span>alert-circle-icon</span>,
  FileText: () => <span>file-text-icon</span>,
}));

const renderDocumentEditorPage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const root = createRoot(container);
  act(() => {
    root.render(<DocumentEditorPage />);
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

describe('DocumentEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNavigate.mockReturnValue(vi.fn());
    mockUseParams.mockReturnValue({
      projectId: 'project-1',
      documentType: DOCUMENT_TYPES.CHAPTER_1,
      docId: undefined,
    });
    mockUseAuthStore.mockReturnValue({
      user: {
        role: ROLES.STUDENT,
      },
    });
    mockUseManuscriptOpenLink.mockReturnValue({
      data: {
        manuscript: {
          title: 'Chapter 1 Manuscript',
          documentType: DOCUMENT_TYPES.CHAPTER_1,
        },
        openLink: 'https://docs.google.com/document/d/mock/edit',
      },
      isLoading: false,
      error: null,
    });
  });

  it('passes the route params into the documents hook and renders the edit view for students', () => {
    const view = renderDocumentEditorPage();

    expect(mockUseManuscriptOpenLink).toHaveBeenCalledWith('project-1', DOCUMENT_TYPES.CHAPTER_1);
    expect(view.container.textContent).toContain('Chapter 1 Manuscript');
    expect(view.container.textContent).toContain('Chapter 1');
    expect(view.container.textContent).toContain('Edit Mode');
    expect(view.container.textContent).toContain('editable');

    view.unmount();
  });

  it('falls back to docId and renders view-only mode for panelists', () => {
    mockUseParams.mockReturnValue({
      projectId: 'project-2',
      documentType: undefined,
      docId: DOCUMENT_TYPES.PROPOSAL,
    });
    mockUseAuthStore.mockReturnValue({
      user: {
        role: ROLES.PANELIST,
      },
    });
    mockUseManuscriptOpenLink.mockReturnValue({
      data: {
        manuscript: {
          title: 'Project Proposal',
          documentType: DOCUMENT_TYPES.PROPOSAL,
        },
        openLink: 'https://docs.google.com/document/d/mock-proposal/preview',
      },
      isLoading: false,
      error: null,
    });

    const view = renderDocumentEditorPage();

    expect(mockUseManuscriptOpenLink).toHaveBeenCalledWith('project-2', DOCUMENT_TYPES.PROPOSAL);
    expect(view.container.textContent).toContain('Full Proposal');
    expect(view.container.textContent).toContain('View Only');
    expect(view.container.textContent).toContain('view-only');

    view.unmount();
  });

  it('renders the loading and error states from the manuscript hook', () => {
    mockUseManuscriptOpenLink.mockReturnValue({
      data: null,
      isLoading: true,
      error: { response: { data: { message: 'Document unavailable.' } } },
    });

    const view = renderDocumentEditorPage();

    expect(view.container.textContent).toContain('loading-icon');
    expect(view.container.textContent).toContain('Document unavailable.');

    view.unmount();
  });
});