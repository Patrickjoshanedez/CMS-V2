import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CanonicalDocumentViewer from './CanonicalDocumentViewer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockRejectedValue(new Error('PDF preview unavailable in test')),
  },
}));

describe('CanonicalDocumentViewer & useArchiveSearchState', () => {
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
    container = null;
    root = null;
  });

  const mockProject = {
    _id: 'archived-doc-101',
    title: 'Precision Agriculture Sensor Node Architecture',
    proponents: 'Juan Dela Cruz, Maria Santos',
    publicationYear: 2026,
    academicYear: '2025-2026',
    program: 'BSIT',
    publisher: 'BukSU Studies Center',
    doi: '10.5281/zenodo.101010',
    originalityScore: 97.5,
  };

  const renderViewer = async (projectProps = mockProject) => {
    await act(async () => {
      root.render(
        <MemoryRouter>
          <CanonicalDocumentViewer project={projectProps} />
        </MemoryRouter>,
      );
    });
  };

  describe('CanonicalDocumentViewer Component', () => {
    it('renders stripped-down viewer with strictly 5 consolidated actions', async () => {
      await renderViewer(mockProject);

      // 1. Back to Search Results breadcrumb
      expect(container.textContent).toContain('Search Results');

      // 2. Download PDF
      expect(container.textContent).toContain('Download PDF');

      // 3. Cite trigger
      expect(container.textContent).toContain('Cite');

      // 4. Originality Report badge
      expect(container.textContent).toContain('98% Original');

      // 5. Copy DOI / Share
      expect(container.textContent).toContain('Copy DOI');

      // Verify absence of drafting / revision diff controls
      expect(container.textContent).not.toContain('Revision Diff (+/-)');
      expect(container.textContent).not.toContain('Peer Remarks');
      expect(container.textContent).not.toContain('Word Diff');
      expect(container.textContent).not.toContain('Line Diff');
    });

    it('toggles originality report slide-out drawer on badge click', async () => {
      await renderViewer(mockProject);

      // Initially drawer is not visible
      expect(container.querySelector('aside[aria-label="Originality Report Details"]')).toBeFalsy();

      const badgeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('98% Original'),
      );
      expect(badgeBtn).toBeTruthy();

      await act(async () => {
        badgeBtn.click();
      });

      // Drawer is now open
      const drawer = container.querySelector('aside[aria-label="Originality Report Details"]');
      expect(drawer).toBeTruthy();
      expect(drawer.textContent).toContain('Audit Verification');
      expect(drawer.textContent).toContain('Winnowing + SentenceTransformers');
      expect(drawer.textContent).toContain('Unique Content: 97.5%');
    });

    it('handles copy DOI / share link action', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      await renderViewer(mockProject);

      const copyBtn = container.querySelector('button[aria-label="Share or copy DOI"]');
      expect(copyBtn).toBeTruthy();

      await act(async () => {
        copyBtn.click();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://doi.org/10.5281/zenodo.101010',
      );
    });

    it('renders missing PDF state gracefully when PDF is not available', async () => {
      await renderViewer({ ...mockProject, manuscriptUrl: null });

      expect(container.textContent).toContain('Manuscript PDF Preview Unavailable');
      expect(container.textContent).toContain('View canonical DOI record');
    });
    it('navigates back to location.state.from when return state is present', async () => {
      await act(async () => {
        root.render(
          <MemoryRouter
            initialEntries={[
              {
                pathname: '/archive/document/archived-doc-101',
                state: { from: '/archive?q=sensor&year_min=2024' },
              },
            ]}
          >
            <Routes>
              <Route
                path="/archive/document/:projectId"
                element={<CanonicalDocumentViewer project={mockProject} />}
              />
              <Route
                path="/archive"
                element={<div id="archive-route-target">Archive Route Result</div>}
              />
            </Routes>
          </MemoryRouter>,
        );
      });

      const backBtn = container.querySelector('button[aria-label="Back to search results"]');
      expect(backBtn).toBeTruthy();

      await act(async () => {
        backBtn.click();
      });

      expect(container.textContent).toContain('Archive Route Result');
    });

    it('falls back to /archive when accessed directly without location state', async () => {
      await act(async () => {
        root.render(
          <MemoryRouter initialEntries={['/archive/document/archived-doc-101']}>
            <Routes>
              <Route
                path="/archive/document/:projectId"
                element={<CanonicalDocumentViewer project={mockProject} />}
              />
              <Route
                path="/archive"
                element={<div id="archive-fallback-target">Archive Default Fallback</div>}
              />
            </Routes>
          </MemoryRouter>,
        );
      });

      const backBtn = container.querySelector('button[aria-label="Back to search results"]');
      expect(backBtn).toBeTruthy();

      await act(async () => {
        backBtn.click();
      });

      expect(container.textContent).toContain('Archive Default Fallback');
    });
  });
});
