import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { ROLES, DOCUMENT_TYPES } from '@cms/shared';
import TemplateManagementPage, { getDocumentApiErrorMessage } from './TemplateManagementPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
let mockSearchParamsValue = new URLSearchParams();
const mockUseAuthStore = vi.fn();
const mockUseProjectManuscripts = vi.fn();
const mockMutation = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockUseNavigate,
  useSearchParams: () => [mockSearchParamsValue, mockSetSearchParams],
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('@/hooks/useDocuments', () => ({
  useProjectManuscripts: (...args) => mockUseProjectManuscripts(...args),
  useUploadManuscript: (...args) => mockMutation('upload', ...args),
  useSubmitManuscriptReview: (...args) => mockMutation('submitReview', ...args),
  useSyncManuscriptComments: (...args) => mockMutation('syncComments', ...args),
  useSyncManuscriptPermissions: (...args) => mockMutation('syncPermissions', ...args),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/common', () => ({
  PageHeader: ({ title, description }) => (
    <header>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}));

vi.mock('@/components/ui/Card', () => ({
  Card: ({ children }) => <section>{children}</section>,
  CardHeader: ({ children }) => <div>{children}</div>,
  CardTitle: ({ children }) => <h2>{children}</h2>,
  CardDescription: ({ children }) => <p>{children}</p>,
  CardContent: ({ children }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/Spinner', () => ({
  Spinner: () => <span>loading</span>,
}));

vi.mock('@/components/ui/Input', () => ({
  Input: (props) => <input {...props} />,
}));

vi.mock('@/components/ui/Label', () => ({
  Label: ({ children, ...props }) => <label {...props}>{children}</label>,
}));

vi.mock('@/components/ui/Badge', () => ({
  Badge: ({ children }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/Alert', () => ({
  Alert: ({ children, variant }) => (
    <div role="alert" data-variant={variant || 'default'}>
      {children}
    </div>
  ),
  AlertDescription: ({ children }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/Select', () => ({
  Select: ({ children }) => <div>{children}</div>,
  SelectContent: ({ children }) => <div>{children}</div>,
  SelectItem: ({ children }) => <div>{children}</div>,
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

vi.mock('@/components/ui/PageSkeleton', () => ({
  default: () => <div>skeleton</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('lucide-react', () => ({
  AlertCircle: () => <span>alert-icon</span>,
  ExternalLink: () => <span>external-icon</span>,
  FileText: () => <span>file-icon</span>,
  RefreshCw: () => <span>refresh-icon</span>,
  Save: () => <span>save-icon</span>,
  Send: () => <span>send-icon</span>,
}));

const renderTemplateManagementPage = () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<TemplateManagementPage />);
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

describe('TemplateManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsValue = new URLSearchParams('projectId=6af501764996bfe56492a850');
    mockUseNavigate.mockReturnValue(vi.fn());
    mockUseAuthStore.mockReturnValue({
      user: {
        role: ROLES.FACULTY,
      },
    });
    mockMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    mockUseProjectManuscripts.mockReturnValue({
      data: {
        manuscripts: [
          {
            _id: 'ms-1',
            documentType: DOCUMENT_TYPES.CHAPTER_1,
            title: 'Chapter 1 - Introduction',
            externalDocUrl: 'https://docs.google.com/document/d/demo/edit?embedded=true',
            reviewStatus: 'pending',
          },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  it('extracts nested backend API error messages with fallback support', () => {
    expect(
      getDocumentApiErrorMessage(
        {
          response: {
            data: { error: { message: 'You are not allowed to access this manuscript.' } },
          },
        },
        'Fallback',
      ),
    ).toBe('You are not allowed to access this manuscript.');

    expect(
      getDocumentApiErrorMessage({ response: { data: { message: 'Flat message' } } }, 'Fallback'),
    ).toBe('Flat message');

    expect(getDocumentApiErrorMessage({}, 'Fallback')).toBe('Fallback');
  });

  it('loads and renders manuscript rows for faculty when projectId is valid', () => {
    const view = renderTemplateManagementPage();

    expect(mockUseProjectManuscripts).toHaveBeenCalledWith('6af501764996bfe56492a850', {
      enabled: true,
    });
    expect(view.container.textContent).toContain('Chapter 1 - Introduction');
    expect(view.container.textContent).toContain('Sync Permissions');
    expect(view.container.textContent).toContain('Sync Comments');
    expect(view.container.textContent).toContain('Submit Review');
    expect(view.container.querySelector('[data-variant="destructive"]')).toBeNull();

    view.unmount();
  });

  it('displays server error message from error.response.data.error.message when request fails', () => {
    mockUseProjectManuscripts.mockReturnValue({
      data: null,
      isLoading: false,
      error: {
        response: {
          data: {
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'You are not allowed to access this manuscript.',
            },
          },
        },
      },
    });

    const view = renderTemplateManagementPage();

    const alert = view.container.querySelector('[data-variant="destructive"]');
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain('You are not allowed to access this manuscript.');

    view.unmount();
  });

  it('disables manuscript fetch and prompts for valid ObjectId when projectId is incomplete', () => {
    mockSearchParamsValue = new URLSearchParams('projectId=6af501');

    const view = renderTemplateManagementPage();

    expect(mockUseProjectManuscripts).toHaveBeenCalledWith('6af501', {
      enabled: false,
    });
    expect(view.container.textContent).toContain('Enter a valid 24-character project ID');

    view.unmount();
  });
});
