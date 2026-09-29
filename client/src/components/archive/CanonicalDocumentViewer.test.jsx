import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CanonicalDocumentViewer from './CanonicalDocumentViewer';
import api from '@/services/api';

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

vi.mock('@/components/submissions/PdfViewerWorkspace', () => ({
  default: ({ children, plagiarismMatches }) => (
    <div data-testid="pdf-viewer-workspace" data-matches={plagiarismMatches?.length || 0}>
      {children}
    </div>
  ),
  PdfViewerWorkspace: ({ children, plagiarismMatches }) => (
    <div data-testid="pdf-viewer-workspace" data-matches={plagiarismMatches?.length || 0}>
      {children}
    </div>
  ),
}));

describe('CanonicalDocumentViewer & useArchiveSearchState', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock.pdf');
      globalThis.URL.revokeObjectURL = vi.fn();
    } else {
      vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:http://localhost/mock.pdf');
      vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => {});
    }
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
    similarityScore: 2.5,
  };

  const mockCleanProject = {
    ...mockProject,
    _id: 'archived-clean-102',
    title: 'Autonomous Agro-Ecological Robotic Platform',
    originalityScore: 100,
    similarityScore: 0,
  };

  const mockProjectWithSources = {
    ...mockProject,
    originalityScore: 92,
    similarityScore: 8,
    plagiarismResult: {
      overallScore: 8,
      matchedSources: [
        {
          sourceId: 'src-authentic-1',
          sourceTitle: 'BukSU Institutional IoT Research Archive',
          similarityPercentage: 8,
          contextSignal: 'paraphrase',
          winnowScore: 0.12,
          semanticScore: 0.88,
          matchedText: 'Sensor node calibration in agricultural environments',
          sourceSnippet:
            'Comprehensive IoT calibration across high-humidity agricultural soil sensors.',
          spans: [
            {
              spanId: 'span-1',
              matchedText: 'Sensor node calibration in agricultural environments',
              similarity: 8,
              pageNumber: 1,
            },
          ],
        },
      ],
    },
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

      // 4. Similarity Report badge (Archive standard: Similarity Score)
      expect(container.textContent).toContain('3% Similarity');

      // 5. Copy DOI / Share
      expect(container.textContent).toContain('Copy DOI');

      // Verify absence of drafting / revision diff controls
      expect(container.textContent).not.toContain('Revision Diff (+/-)');
      expect(container.textContent).not.toContain('Peer Remarks');
      expect(container.textContent).not.toContain('Word Diff');
      expect(container.textContent).not.toContain('Line Diff');
    });

    it('toggles similarity report slide-out drawer on badge click', async () => {
      await renderViewer(mockProject);

      // Initially drawer is not visible
      expect(container.querySelector('aside[aria-label="Originality Report Details"]')).toBeFalsy();

      const badgeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('3% Similarity'),
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
      expect(drawer.textContent).toContain('Similarity Overlap: 2.5%');
    });

    it('allows toggling between Academic Paper and Academic Journal view modes', async () => {
      await renderViewer(mockProject);

      const paperTab = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Academic Paper'),
      );
      const journalTab = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Academic Journal'),
      );

      expect(paperTab).toBeTruthy();
      expect(journalTab).toBeTruthy();
      expect(paperTab.getAttribute('aria-selected')).toBe('true');
      expect(journalTab.getAttribute('aria-selected')).toBe('false');

      await act(async () => {
        journalTab.click();
      });

      expect(paperTab.getAttribute('aria-selected')).toBe('false');
      expect(journalTab.getAttribute('aria-selected')).toBe('true');
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

    it('renders zero overlap accurately for clean first upload with 0% similarity and 0 fake sources', async () => {
      await renderViewer(mockCleanProject);

      const badgeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('0% Similarity'),
      );
      expect(badgeBtn).toBeTruthy();

      await act(async () => {
        badgeBtn.click();
      });

      const drawer = container.querySelector('aside[aria-label="Originality Report Details"]');
      expect(drawer).toBeTruthy();
      expect(drawer.textContent).toContain('Zero Overlap Detected (100% Unique)');
      expect(drawer.textContent).toContain('0 matching passages found');
      expect(drawer.textContent).not.toContain('BukSU Capstone & Research Repository');
    });

    it('renders Turnitin-style Match Overview with authentic sources, signal badges and dual exact/semantic bars in drawer', async () => {
      await renderViewer(mockProjectWithSources);

      const badgeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('8% Similarity'),
      );
      expect(badgeBtn).toBeTruthy();
      await act(async () => {
        badgeBtn.click();
      });

      const drawer = container.querySelector('aside[aria-label="Originality Report Details"]');
      expect(drawer).toBeTruthy();

      // Legend Strip checks
      expect(drawer.textContent).toContain('Visual Tiers & Context Signals');
      expect(drawer.textContent).toContain('Paraphrase');
      expect(drawer.textContent).toContain('Verbatim');

      // Match Overview & Authentic Sources check
      expect(drawer.textContent).toContain('Match Overview');
      expect(drawer.textContent).toContain('BukSU Institutional IoT Research Archive');

      // Check context signal badge (VERBATIM / PARAPHRASE / MIXED)
      expect(drawer.textContent).toContain('PARAPHRASE');

      // Check dual bars
      expect(drawer.textContent).toContain('Exact Overlap (Winnowing)');
      expect(drawer.textContent).toContain('Semantic Overlap (Embedding Cosine)');

      // Check action buttons in row
      expect(drawer.textContent).toContain('Jump to Paper');
      expect(drawer.textContent).toContain('Open Source');
    });

    it('allows selecting an authentic source to inspect active source detail with 3-bar breakdown and jump to paper', async () => {
      await renderViewer(mockProjectWithSources);

      const badgeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('8% Similarity'),
      );
      await act(async () => {
        badgeBtn.click();
      });

      const drawer = container.querySelector('aside[aria-label="Originality Report Details"]');
      expect(drawer).toBeTruthy();

      // Find and click the source container or title
      const sourceTitleBtn = Array.from(drawer.querySelectorAll('button')).find((b) =>
        b.textContent.includes('BukSU Institutional IoT Research Archive'),
      );
      expect(sourceTitleBtn).toBeTruthy();

      await act(async () => {
        sourceTitleBtn.click();
      });

      // Active detail panel opens
      expect(drawer.textContent).toContain('Blended Overlap');
      expect(drawer.textContent).toContain('Manuscript Excerpt');
      expect(drawer.textContent).toContain('Archive Source Match');
      expect(drawer.textContent).toContain('Jump to Paper (Highlight on Manuscript Canvas)');
      expect(drawer.textContent).toContain('Open Source Publication in Archive');

      // Test jump to paper action
      const jumpBtn = Array.from(drawer.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Jump to Paper'),
      );
      expect(jumpBtn).toBeTruthy();

      await act(async () => {
        jumpBtn.click();
      });

      // Close back to source list
      const backBtn = drawer.querySelector('button[aria-label="Back to all sources"]');
      expect(backBtn).toBeTruthy();
      await act(async () => {
        backBtn.click();
      });

      expect(drawer.textContent).toContain('Match Overview');
    });

    it('toggles canvas view mode between Clean Manuscript and Integrity Highlights', async () => {
      api.get.mockResolvedValueOnce({
        data: new Blob(['%PDF-1.4 mock content'], { type: 'application/pdf' }),
      });

      await renderViewer({
        ...mockProject,
        manuscriptUrl: '/projects/archived-doc-101/manuscript',
      });

      // Clean mode by default - renders iframe
      const cleanBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Clean Manuscript'),
      );
      const integrityBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Integrity Highlights'),
      );

      expect(cleanBtn).toBeTruthy();
      expect(integrityBtn).toBeTruthy();
      expect(container.querySelector('iframe')).toBeTruthy();
      expect(container.querySelector('[data-testid="pdf-viewer-workspace"]')).toBeFalsy();

      // Switch to Integrity Highlights mode
      await act(async () => {
        integrityBtn.click();
      });

      // Now renders PdfViewerWorkspace
      expect(container.querySelector('[data-testid="pdf-viewer-workspace"]')).toBeTruthy();
    });
  });
});
