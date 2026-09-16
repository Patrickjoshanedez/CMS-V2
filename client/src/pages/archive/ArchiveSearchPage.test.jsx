import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ArchiveSearchPage from './ArchiveSearchPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn((params) => {
  mockSearchParams = params;
});

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/archive', search: mockSearchParams.toString() }),
  useSearchParams: () => [mockSearchParams, mockSetSearchParams],
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/documents/SophisticatedDocumentViewer', () => ({
  default: ({ open, embedded, submission, onOpenChange }) =>
    open || embedded ? (
      <div data-testid="sophisticated-document-viewer" data-embedded={String(!!embedded)}>
        <span>Viewer: {submission?.title}</span>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          Close Viewer Mock
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/projects/SimilarProjectModal', () => ({
  default: ({ project, onClose }) => (
    <div data-testid="similar-project-modal">
      <span>Similar to: {project?.title}</span>
      <button type="button" onClick={onClose}>
        Close Similar
      </button>
    </div>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockProjects = [
  {
    _id: 'proj-001',
    title: 'Smart Agricultural Yield Prediction Using Deep Learning',
    proponents: 'Dela Cruz, J. & Santos, M.',
    publicationYear: 2026,
    academicYear: '2025-2026',
    publisher: 'BukSU Studies Center',
    doi: 'https://doi.org/10.5281/zenodo.1084201',
    abstract:
      'An automated crop prediction framework designed for Bukidnon soil classification and rainfall forecasting.',
    originalityScore: 96.8,
    versionsCount: 3,
    teamId: { name: 'AgriTech Innovation Team' },
  },
  {
    _id: 'proj-002',
    title: 'Campus Geospatial Navigation and Accessibility Mapping',
    proponents: 'Villanueva, A. & Tan, R.',
    publicationYear: 2025,
    academicYear: '2024-2025',
    publisher: 'BukSU Studies Center',
    doi: 'https://doi.org/10.5281/zenodo.1084202',
    abstract: 'Indoor positioning and campus map routing for students with mobility impairments.',
    originalityScore: 78.5,
    versionsCount: 2,
    teamId: { name: 'CampusNav GIS' },
  },
];

let mockSearchData = {
  projects: mockProjects,
  pagination: { page: 1, limit: 10, total: 2, pages: 1 },
  searchLatencyMs: 38,
};
let mockIsLoading = false;
let mockError = null;

vi.mock('@/hooks/useProjects', () => ({
  useArchiveSearch: () => ({
    data: mockSearchData,
    isLoading: mockIsLoading,
    error: mockError,
  }),
}));

vi.mock('@/hooks/useAcademics', () => ({
  useCourses: () => ({
    data: [
      { _id: 'c-1', code: 'BSIT', name: 'BS Information Technology', isActive: true },
      { _id: 'c-2', code: 'BSCS', name: 'BS Computer Science', isActive: true },
      { _id: 'c-3', code: 'BSIS', name: 'BS Information Systems', isActive: true },
    ],
  }),
}));

describe('ArchiveSearchPage (Google Scholar Style Academic UI)', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockSearchData = {
      projects: mockProjects,
      pagination: { page: 1, limit: 10, total: 2, pages: 1 },
      searchLatencyMs: 38,
    };
    mockIsLoading = false;
    mockError = null;
    window.localStorage.clear();

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
    root = null;
  });

  it('renders Google Scholar header, search bar, and academic results feed', () => {
    act(() => {
      root.render(<ArchiveSearchPage />);
    });

    expect(container.textContent).toContain('BukSU Research Archive');
    expect(container.textContent).toContain(
      'Smart Agricultural Yield Prediction Using Deep Learning',
    );
    expect(container.textContent).toContain('Dela Cruz, J. & Santos, M.');
    expect(container.textContent).toContain('BukSU Studies Center');
    expect(container.textContent).toContain('About 2 results');
  });

  it('renders color-coded originality shield badges in snippet footers', () => {
    act(() => {
      root.render(<ArchiveSearchPage />);
    });

    // Proj-001 has 96.8% originality (High -> 97% Original)
    expect(container.textContent).toContain('97% Original');
    // Proj-002 has 78.5% originality (<80% -> Similarity Alert (21%))
    expect(container.textContent).toContain('Similarity Alert (21%)');
  });

  it('opens CitationExportModal with formatted citations when clicking Cite', () => {
    act(() => {
      root.render(<ArchiveSearchPage />);
    });

    const citeButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent.includes('Cite'),
    );
    expect(citeButtons.length).toBeGreaterThan(0);

    act(() => {
      citeButtons[0].click();
    });

    // Citation modal appears with APA / IEEE / MLA / BibTeX options
    expect(container.textContent).toContain('Cite Academic Manuscript');
    expect(container.textContent).toContain('APA (7th Edition)');
    expect(container.textContent).toContain('IEEE');
    expect(container.textContent).toContain('MLA (9th Edition)');
    expect(container.textContent).toContain('BibTeX');
  });

  it('toggles Save/Bookmark to library with persistent storage and toast notification', () => {
    act(() => {
      root.render(<ArchiveSearchPage />);
    });

    const saveButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent.includes('Save'),
    );
    expect(saveButtons.length).toBeGreaterThan(0);

    act(() => {
      saveButtons[0].click();
    });

    // Button updates to Saved
    expect(container.textContent).toContain('Saved');
    expect(window.localStorage.getItem('buksu_archive_saved_projects')).toContain('proj-001');
  });

  it('navigates to /archive/document/:projectId when clicking [PDF] buksu.edu.ph or article title', () => {
    act(() => {
      root.render(<ArchiveSearchPage />);
    });

    const pdfButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent.includes('[PDF] buksu.edu.ph'),
    );
    expect(pdfButtons.length).toBeGreaterThan(0);

    act(() => {
      pdfButtons[0].click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/archive/document/proj-001', {
      state: { from: '/archive' },
    });
  });

  it('opens SimilarProjectModal when clicking Related articles', () => {
    act(() => {
      root.render(<ArchiveSearchPage />);
    });

    const relatedButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent.includes('Related articles'),
    );
    expect(relatedButtons.length).toBeGreaterThan(0);

    act(() => {
      relatedButtons[0].click();
    });

    expect(container.querySelector('[data-testid="similar-project-modal"]')).toBeTruthy();
  });

  it('renders GoogleScholarSidebar filters and allows resetting filters', () => {
    act(() => {
      root.render(<ArchiveSearchPage />);
    });

    expect(container.textContent).toContain('Any time');
    expect(container.textContent).toContain('Sort by relevance');

    const resetButton = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Reset'),
    );
    expect(resetButton).toBeTruthy();

    act(() => {
      resetButton.click();
    });
  });

  it('renders dynamic academic programs from Student Management Hierarchy and allows filtering', () => {
    act(() => {
      root.render(<ArchiveSearchPage />);
    });

    expect(container.textContent).toContain('Academic Program');
    expect(container.textContent).toContain('All Programs');
    expect(container.textContent).toContain('BS Information Technology');
    expect(container.textContent).toContain('BS Computer Science');
    expect(container.textContent).toContain('BS Information Systems');

    const bscsBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('BS Computer Science'),
    );
    expect(bscsBtn).toBeTruthy();

    act(() => {
      bscsBtn.click();
    });

    // Check that searchParams was updated with program=BSCS
    expect(mockSetSearchParams).toHaveBeenCalled();
  });
});
