import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScanHero from './ScanHero';
import ScanButton from './ScanButton';
import DropZone from './DropZone';
import MatchSnippet from './MatchSnippet';
import ScoreBar from './ScoreBar';
import PlagiarismChecker from '@/components/submissions/PlagiarismChecker';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => {
    const state = {
      user: { id: 'usr-1', role: 'faculty' },
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

vi.mock('@/stores/settingsStore', () => ({
  useSettingsStore: () => ({
    plagiarismWarningThreshold: 15,
    plagiarismRejectThreshold: 25,
    getTemplateUrl: () => 'https://example.com/template',
    fetchSettings: vi.fn(),
  }),
}));

describe('Plagiarism UI Normalized Components', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
    root = null;
  });

  describe('ScanHero', () => {
    it('renders clean institutional typography without neon gradients or raw emojis', () => {
      act(() => {
        root.render(<ScanHero />);
      });

      const text = container.textContent;
      expect(text).toContain('Plagiarism & Similarity Checker');
      expect(text).toContain('Institutional Archive');
      expect(text).toContain('Compare a manuscript or proposal with the institutional archive.');
      expect(text).toContain('Review matching passages and their sources');
      ['🚀', '⚡', '🔍', '⏳', '⚠️', '🚨', '✓'].forEach((emoji) => {
        expect(text).not.toContain(emoji);
      });
    });
  });

  describe('ScanButton', () => {
    it('renders subtle slim progress bar with ARIA progressbar and status semantics', () => {
      act(() => {
        root.render(
          <ScanButton disabled={false} scanning={true} elapsedSeconds={12} onClick={() => {}} />,
        );
      });

      expect(container.textContent).toContain('Analyzing document with BAAI/bge-m3 & Winnowing…');
      expect(container.textContent).toContain('00:12');

      // Verify old loud animation is NOT present
      expect(container.querySelector('.cms-fluid-track')).toBeNull();

      const progressbar = container.querySelector(
        '.cms-progress-indeterminate[role="progressbar"]',
      );
      expect(progressbar).not.toBeNull();
      expect(progressbar.getAttribute('aria-label')).toBe('Manuscript scan progress');
      expect(progressbar.hasAttribute('aria-valuenow')).toBe(false);

      const statusRegion = container.querySelector('[role="status"]');
      expect(statusRegion).not.toBeNull();
      expect(statusRegion.getAttribute('aria-live')).toBe('polite');

      const button = container.querySelector('button');
      expect(button.getAttribute('aria-busy')).toBe('true');
      expect(button.className).toContain('whitespace-normal');
    });

    it('renders ready state when not scanning', () => {
      act(() => {
        root.render(
          <ScanButton disabled={false} scanning={false} elapsedSeconds={0} onClick={() => {}} />,
        );
      });

      expect(container.textContent).toContain('Scan for Similarities');
      const button = container.querySelector('button');
      expect(button.getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('DropZone', () => {
    it('renders the shared upload button and opens the native file picker when empty', () => {
      const onFileSelected = vi.fn();
      act(() => {
        root.render(
          <DropZone file={null} scanning={false} errorMessage="" onFileSelected={onFileSelected} />,
        );
      });

      expect(container.textContent).toContain('Drag & drop manuscript here');
      const uploadButton = container.querySelector('button[aria-label="Choose a manuscript file"]');
      expect(uploadButton).not.toBeNull();
      expect(uploadButton.className).toContain('border-dashed');
      const iconWrapper = uploadButton.querySelector('.h-11.w-11');
      expect(iconWrapper).not.toBeNull();

      const input = container.querySelector('input[type="file"]');
      const clickSpy = vi.spyOn(input, 'click');
      act(() => uploadButton.click());
      expect(clickSpy).toHaveBeenCalledOnce();

      const pickedFile = new File(['content'], 'chapter.pdf', { type: 'application/pdf' });
      Object.defineProperty(input, 'files', { configurable: true, value: [pickedFile] });
      act(() => input.dispatchEvent(new Event('change', { bubbles: true })));
      expect(onFileSelected).toHaveBeenCalledWith(pickedFile);
      expect(input.value).toBe('');
    });

    it('selects a dropped manuscript and disables selection while scanning', () => {
      const onFileSelected = vi.fn();
      const droppedFile = new File(['content'], 'chapter.pdf', { type: 'application/pdf' });
      act(() => {
        root.render(
          <DropZone file={null} scanning={false} errorMessage="" onFileSelected={onFileSelected} />,
        );
      });

      const uploadButton = container.querySelector('button[aria-label="Choose a manuscript file"]');
      const dropEvent = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [droppedFile] } });
      act(() => uploadButton.dispatchEvent(dropEvent));
      expect(dropEvent.defaultPrevented).toBe(true);
      expect(onFileSelected).toHaveBeenCalledWith(droppedFile);

      act(() => {
        root.render(
          <DropZone file={null} scanning errorMessage="" onFileSelected={onFileSelected} />,
        );
      });
      const scanningButton = container.querySelector(
        'button[aria-label="Choose a manuscript file"]',
      );
      expect(scanningButton.disabled).toBe(true);
      expect(scanningButton.getAttribute('aria-disabled')).toBe('true');
      act(() => scanningButton.click());
      expect(onFileSelected).toHaveBeenCalledTimes(1);
    });

    it('renders upload errors through the shared alert primitive', () => {
      act(() => {
        root.render(
          <DropZone
            file={null}
            scanning={false}
            errorMessage="Only PDF or Word files are accepted."
            onFileSelected={() => {}}
          />,
        );
      });

      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        'Only PDF or Word files are accepted.',
      );
    });

    it('renders semantic selected file card without nested role="button" container', () => {
      const dummyFile = new File(['content'], 'sample_chapter1.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      act(() => {
        root.render(
          <DropZone file={dummyFile} scanning={false} errorMessage="" onFileSelected={() => {}} />,
        );
      });

      expect(container.textContent).toContain('sample_chapter1.docx');
      expect(container.textContent).toContain('DOCX');
      expect(container.textContent).toContain('Change file');
      expect(container.textContent).toContain('Remove file');

      // Crucial: The outer selected file card container MUST NOT have role="button"
      const selectedCard = container.querySelector('.card');
      expect(selectedCard).not.toBeNull();
      expect(selectedCard.getAttribute('role')).toBeNull();

      // Buttons inside must be interactive top-level buttons
      const removeBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent.includes('Remove file'),
      );
      expect(removeBtn).not.toBeNull();
      expect(removeBtn.closest('[role="button"]')).toBeNull();
    });
  });

  describe('MatchSnippet', () => {
    it('uses shared surfaces, normalizes manuscript text, and preserves the jump action', () => {
      const onJump = vi.fn();
      act(() => {
        root.render(
          <MatchSnippet
            match={{
              similarity: 0.63,
              submittedText: '  Submitted\n  passage  ',
              matchedText: 'Matching source passage',
            }}
            sourceColor="var(--chart-1)"
            onJump={onJump}
          />,
        );
      });

      expect(container.querySelector('.card')).not.toBeNull();
      expect(container.textContent).toContain('Submitted passage');
      expect(container.textContent).toContain('Matching source passage');
      expect(container.textContent).toContain('63%');
      expect(container.querySelector('.card')?.className).toContain('bg-card');
      expect(container.querySelector('.card [style]')?.getAttribute('style')).toContain(
        '--source-color: var(--chart-1)',
      );

      const jumpButton = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent.includes('Jump to in document'),
      );
      expect(jumpButton).not.toBeNull();
      act(() => jumpButton.click());
      expect(onJump).toHaveBeenCalledOnce();
    });

    it('renders empty snippets safely and truncates long passages', () => {
      const longText = 'word '.repeat(60);
      act(() => {
        root.render(
          <MatchSnippet
            match={{ similarity: 1, submittedText: '', matchedText: longText }}
            sourceColor="var(--chart-2)"
          />,
        );
      });

      const passages = Array.from(container.querySelectorAll('p')).filter((paragraph) =>
        paragraph.className.includes('font-mono'),
      );
      expect(passages[0].textContent).toBe('N/A');
      expect(passages[1].textContent).toHaveLength(223);
      expect(passages[1].textContent.endsWith('...')).toBe(true);
      expect(container.textContent).toContain('100%');
    });
  });

  describe('ScoreBar', () => {
    it('uses shared progress and semantic risk states for normalized similarity scores', () => {
      act(() => {
        root.render(<ScoreBar finalScore={0.81} lexicalScore={0.25} semanticScore={0.5} />);
      });

      const progress = container.querySelector('[role="progressbar"]');
      expect(progress.getAttribute('aria-label')).toBe('Final similarity score');
      expect(progress.getAttribute('aria-valuenow')).toBe('81');
      expect(container.textContent).toContain('81% final');
      expect(container.textContent).toContain('Critical');
      expect(container.textContent).toContain('Lexical: 25%');
      expect(container.textContent).toContain('Semantic: 50%');
      expect(progress.querySelector('.bg-destructive')).not.toBeNull();
    });

    it('keeps low similarity results on semantic success tokens', () => {
      act(() => {
        root.render(<ScoreBar finalScore={8} lexicalScore={12} semanticScore={6} />);
      });

      expect(container.textContent).toContain('Low');
      expect(
        container.querySelector('[role="progressbar"]')?.querySelector('.bg-success'),
      ).not.toBeNull();
    });
  });

  describe('PlagiarismChecker', () => {
    it('renders with design token card and allows expand/collapse', () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false },
        },
      });

      act(() => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <PlagiarismChecker submissionId="sub-123" submissionTitle="Chapter 1 Proposal" />
          </QueryClientProvider>,
        );
      });

      // Verify card uses standard tokens
      const card = container.querySelector('.rounded-xl.border.border-border\\/70.bg-card');
      expect(card).not.toBeNull();

      // Verify no tw- prefixed classes exist
      const allClassNames = Array.from(container.querySelectorAll('*'))
        .map((el) => el.className)
        .join(' ');
      expect(allClassNames).not.toContain('tw-');

      // Expand button is present
      const expandBtn = container.querySelector('button');
      expect(expandBtn).not.toBeNull();
      expect(expandBtn.textContent).toContain('Expand');

      // Click to expand
      act(() => {
        expandBtn.click();
      });

      expect(container.textContent).toContain('Collapse');
      expect(container.textContent).toContain('Start Plagiarism Check');
      expect(container.textContent).toContain('Settle With Mock Score');
    });
  });
});
