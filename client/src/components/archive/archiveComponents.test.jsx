import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent, screen } from '@testing-library/react';
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
      expect(button.className).toContain('bg-success/10');
    });

    it('renders amber moderate originality badge for scores between 80% and 95%', () => {
      act(() => {
        root.render(<OriginalityShieldBadge score={88.0} />);
      });

      expect(container.textContent).toContain('88% Original');
      const button = container.querySelector('button');
      expect(button.className).toContain('bg-warning/10');
    });

    it('renders red similarity alert badge for scores < 80%', () => {
      act(() => {
        root.render(<OriginalityShieldBadge score={72.0} />);
      });

      expect(container.textContent).toContain('Similarity Alert (28%)');
      const button = container.querySelector('button');
      expect(button.className).toContain('bg-destructive/10');
    });

    it('preserves the document-opening action for the originality control', () => {
      const onClick = vi.fn();

      act(() => {
        root.render(<OriginalityShieldBadge score={98.4} onClick={onClick} />);
      });

      fireEvent.click(screen.getByRole('button', { name: 'Originality score: 98% Original' }));
      expect(onClick).toHaveBeenCalledOnce();
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

      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('renders APA, IEEE, MLA, and BibTeX citations when open', () => {
      act(() => {
        root.render(<CitationExportModal open={true} project={mockProject} onClose={vi.fn()} />);
      });

      expect(screen.getByRole('dialog', { name: 'Cite Academic Manuscript' })).toBeTruthy();
      expect(screen.getByText('Decentralized Crop Yield Verification Network')).toBeTruthy();
      expect(screen.getByText('APA (7th Edition)')).toBeTruthy();
      expect(screen.getByText('IEEE')).toBeTruthy();
      expect(screen.getByText('MLA (9th Edition)')).toBeTruthy();
      expect(screen.getByText('BibTeX')).toBeTruthy();
      expect(screen.getByText(/@article\{buksu_cript-99_2026/)).toBeTruthy();
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

      const copyButtons = Array.from(screen.getAllByRole('button')).filter((b) =>
        b.textContent.includes('Copy'),
      );
      expect(copyButtons.length).toBeGreaterThan(0);

      act(() => {
        copyButtons[0].click();
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('closes through the shared dialog Escape handling', () => {
      const onClose = vi.fn();

      act(() => {
        root.render(<CitationExportModal open project={mockProject} onClose={onClose} />);
      });

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
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

    it('changes the search scope through the shared select menu', () => {
      const onScopeChange = vi.fn();

      act(() => {
        root.render(
          <GoogleScholarSearchBar
            query=""
            onQueryChange={vi.fn()}
            scope="all"
            onScopeChange={onScopeChange}
            onSearch={vi.fn()}
          />,
        );
      });

      const scopeTrigger = container.querySelector('[aria-label="Search scope"]');
      const searchInput = container.querySelector('input[role="combobox"]');
      act(() => searchInput.focus());
      expect(container.querySelector('[role="listbox"]')).toBeTruthy();
      act(() => scopeTrigger.focus());
      fireEvent.keyDown(scopeTrigger, { key: 'ArrowDown' });
      expect(screen.getByRole('option', { name: 'DOI Match' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('option', { name: 'DOI Match' }));

      expect(onScopeChange).toHaveBeenCalledWith('doi');
      expect(container.querySelector('[role="listbox"]')).toBeNull();
    });

    it('selects a suggested topic from the combobox keyboard controls', () => {
      const onQueryChange = vi.fn();
      const onSearch = vi.fn();

      act(() => {
        root.render(
          <GoogleScholarSearchBar
            query=""
            onQueryChange={onQueryChange}
            scope="all"
            onScopeChange={vi.fn()}
            onSearch={onSearch}
          />,
        );
      });

      const input = container.querySelector('input[role="combobox"]');
      act(() => input.focus());
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onQueryChange).toHaveBeenCalledWith('Deep Learning Agricultural Yield Prediction');
      expect(onSearch).toHaveBeenCalledWith('Deep Learning Agricultural Yield Prediction');
      expect(container.querySelector('[role="listbox"]')).toBeNull();
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

    it('renders dynamic courses from student management hierarchy and selects them', () => {
      const onProgramChange = vi.fn();
      const mockCourses = [
        {
          _id: 'course-it',
          code: 'BSIT',
          name: 'Bachelor of Science in Information Technology',
          isActive: true,
        },
        {
          _id: 'course-data',
          code: 'BSDSA',
          name: 'BS Data Science and Analytics',
          isActive: true,
        },
      ];

      act(() => {
        root.render(
          <GoogleScholarSidebar
            dateFilter="any"
            onDateFilterChange={vi.fn()}
            onApplyCustomRange={vi.fn()}
            courses={mockCourses}
            program="BSDSA"
            onProgramChange={onProgramChange}
            sortBy="relevance"
            onSortByChange={vi.fn()}
            onResetFilters={vi.fn()}
          />,
        );
      });

      expect(container.textContent).toContain('Bachelor of Science in Information Technology');
      expect(container.textContent).toContain('BS Data Science and Analytics');

      const itBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Bachelor of Science in Information Technology'),
      );
      expect(itBtn).toBeTruthy();

      act(() => {
        itBtn.click();
      });

      expect(onProgramChange).toHaveBeenCalledWith('BSIT');
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

      const mobileFilters = screen.getByRole('dialog', { name: 'Filter Archive' });
      expect(mobileFilters).toBeTruthy();
      const closeBtn = screen.getByRole('button', { name: 'Close filters' });

      act(() => {
        closeBtn.click();
      });

      expect(onCloseMobile).toHaveBeenCalled();
    });
  });
});
