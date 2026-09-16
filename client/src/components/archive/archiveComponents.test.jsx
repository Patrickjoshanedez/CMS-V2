import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import OriginalityShieldBadge from './OriginalityShieldBadge';
import CitationExportModal from './CitationExportModal';
import GoogleScholarSearchBar from './GoogleScholarSearchBar';
import GoogleScholarSidebar from './GoogleScholarSidebar';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Google Scholar Research Archive Components', () => {
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

  describe('OriginalityShieldBadge', () => {
    it('renders green verified originality badge for scores > 95%', () => {
      act(() => {
        root.render(<OriginalityShieldBadge score={98.4} />);
      });

      expect(container.textContent).toContain('98% Original');
      const button = container.querySelector('button');
      expect(button.className).toContain('text-[#2e7d32]');
    });

    it('renders amber moderate originality badge for scores between 80% and 95%', () => {
      act(() => {
        root.render(<OriginalityShieldBadge score={88.0} />);
      });

      expect(container.textContent).toContain('88% Original');
      const button = container.querySelector('button');
      expect(button.className).toContain('text-[#f57c00]');
    });

    it('renders red similarity alert badge for scores < 80%', () => {
      act(() => {
        root.render(<OriginalityShieldBadge score={72.0} />);
      });

      expect(container.textContent).toContain('Similarity Alert (28%)');
      const button = container.querySelector('button');
      expect(button.className).toContain('text-[#c62828]');
    });
  });

  describe('CitationExportModal', () => {
    const mockProject = {
      _id: 'manuscript-99',
      title: 'Decentralized Crop Yield Verification Network',
      proponents: 'BukSU Research Team',
      publicationYear: 2026,
      publisher: 'Bukidnon State University Studies Center',
      doi: '10.5281/zenodo.99999',
    };

    it('does not render when open is false', () => {
      act(() => {
        root.render(<CitationExportModal open={false} project={mockProject} onClose={vi.fn()} />);
      });

      expect(container.children.length).toBe(0);
    });

    it('renders APA, IEEE, MLA, and BibTeX citations when open', () => {
      act(() => {
        root.render(<CitationExportModal open={true} project={mockProject} onClose={vi.fn()} />);
      });

      expect(container.textContent).toContain('Cite Academic Manuscript');
      expect(container.textContent).toContain('Decentralized Crop Yield Verification Network');
      expect(container.textContent).toContain('APA (7th Edition)');
      expect(container.textContent).toContain('IEEE');
      expect(container.textContent).toContain('MLA (9th Edition)');
      expect(container.textContent).toContain('BibTeX');
      expect(container.textContent).toContain('@article{buksu_cript-99_2026');
    });

    it('handles clipboard copy on citation format', () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });

      act(() => {
        root.render(<CitationExportModal open={true} project={mockProject} onClose={vi.fn()} />);
      });

      const copyButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
        b.textContent.includes('Copy'),
      );
      expect(copyButtons.length).toBeGreaterThan(0);

      act(() => {
        copyButtons[0].click();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
  });

  describe('GoogleScholarSearchBar', () => {
    it('renders input, scope selector, and search button', () => {
      const onQueryChange = vi.fn();
      const onScopeChange = vi.fn();
      const onSearch = vi.fn();

      act(() => {
        root.render(
          <GoogleScholarSearchBar
            query="Deep Learning"
            onQueryChange={onQueryChange}
            scope="title"
            onScopeChange={onScopeChange}
            onSearch={onSearch}
            totalResults={15}
          />,
        );
      });

      const input = container.querySelector('input');
      expect(input.value).toBe('Deep Learning');

      // Check scope dropdown option
      expect(container.textContent).toContain('Title Only');

      const submitButton = container.querySelector('button[type="submit"]');
      expect(submitButton).toBeTruthy();

      act(() => {
        submitButton.click();
      });

      expect(onSearch).toHaveBeenCalledWith('Deep Learning');
    });

    it('clears query when clicking clear button', () => {
      const onQueryChange = vi.fn();
      const onSearch = vi.fn();

      act(() => {
        root.render(
          <GoogleScholarSearchBar
            query="AI in Agriculture"
            onQueryChange={onQueryChange}
            scope="all"
            onScopeChange={vi.fn()}
            onSearch={onSearch}
          />,
        );
      });

      const clearBtn = container.querySelector('button[aria-label="Clear search query"]');
      expect(clearBtn).toBeTruthy();

      act(() => {
        clearBtn.click();
      });

      expect(onQueryChange).toHaveBeenCalledWith('');
      expect(onSearch).toHaveBeenCalledWith('');
    });

    it('implements combobox accessibility and browser normalization overrides', () => {
      act(() => {
        root.render(
          <GoogleScholarSearchBar
            query="Plagiarism"
            onQueryChange={vi.fn()}
            scope="all"
            onScopeChange={vi.fn()}
            onSearch={vi.fn()}
          />,
        );
      });

      const input = container.querySelector('input[type="search"]');
      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      expect(input.className).toContain('appearance-none');
      expect(input.className).toContain('[&::-webkit-search-cancel-button]:hidden');
    });

    it('dismisses suggestions overlay on Escape key press', () => {
      act(() => {
        root.render(
          <GoogleScholarSearchBar
            query="Automated"
            onQueryChange={vi.fn()}
            scope="all"
            onScopeChange={vi.fn()}
            onSearch={vi.fn()}
          />,
        );
      });

      const input = container.querySelector('input');
      act(() => {
        input.focus();
      });

      expect(container.querySelector('#archive-search-suggestions')).toBeTruthy();

      act(() => {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      });

      expect(container.querySelector('#archive-search-suggestions')).toBeFalsy();
    });
  });

  describe('GoogleScholarSidebar', () => {
    it('renders date presets, custom range, sort by, and program facets', () => {
      const onDateFilterChange = vi.fn();
      const onSortByChange = vi.fn();
      const onToggleCitations = vi.fn();
      const onProgramChange = vi.fn();

      act(() => {
        root.render(
          <GoogleScholarSidebar
            dateFilter="2026"
            onDateFilterChange={onDateFilterChange}
            customMinYear=""
            customMaxYear=""
            onApplyCustomRange={vi.fn()}
            program="BSIT"
            onProgramChange={onProgramChange}
            sortBy="relevance"
            onSortByChange={onSortByChange}
            includeCitations={true}
            onToggleCitations={onToggleCitations}
            includeFilings={true}
            onToggleFilings={vi.fn()}
            onResetFilters={vi.fn()}
            isOpenMobile={false}
          />,
        );
      });

      expect(container.textContent).toContain('Publication Date');
      expect(container.textContent).toContain('Since 2026');
      expect(container.textContent).toContain('Sort by relevance');
      expect(container.textContent).toContain('Include citations');
      expect(container.textContent).toContain('Academic Program');
      expect(container.textContent).toContain('BS Information Technology');

      const programBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('BS Computer Science'),
      );
      expect(programBtn).toBeTruthy();

      act(() => {
        programBtn.click();
      });

      expect(onProgramChange).toHaveBeenCalledWith('BSCS');
    });

    it('renders mobile drawer when isOpenMobile is true', () => {
      const onCloseMobile = vi.fn();

      act(() => {
        root.render(
          <GoogleScholarSidebar
            dateFilter="any"
            onDateFilterChange={vi.fn()}
            customMinYear=""
            customMaxYear=""
            onApplyCustomRange={vi.fn()}
            sortBy="relevance"
            onSortByChange={vi.fn()}
            includeCitations={true}
            onToggleCitations={vi.fn()}
            includeFilings={true}
            onToggleFilings={vi.fn()}
            onResetFilters={vi.fn()}
            isOpenMobile={true}
            onCloseMobile={onCloseMobile}
          />,
        );
      });

      expect(container.textContent).toContain('Filter Archive');
      const closeBtn = container.querySelector('button[aria-label="Close filters"]');
      expect(closeBtn).toBeTruthy();

      act(() => {
        closeBtn.click();
      });

      expect(onCloseMobile).toHaveBeenCalled();
    });
  });
});
