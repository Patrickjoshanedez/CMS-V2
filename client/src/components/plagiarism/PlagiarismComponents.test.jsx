import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScanHero from './ScanHero';
import ScanButton from './ScanButton';
import DropZone from './DropZone';
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
        root.render(<ScanHero semanticModel="BAAI/bge-m3" />);
      });

      const text = container.textContent;
      expect(text).toContain('Plagiarism & Similarity Checker');
      expect(text).toContain('Archive Integrity Scan');
      expect(text).toContain('BAAI/bge-m3 · 1,024-dim · 8,192 tokens');
      expect(text).toContain('Full Archive Index');
      ['🚀', '⚡', '🔍', '⏳', '⚠️', '🚨', '✓'].forEach((emoji) => {
        expect(text).not.toContain(emoji);
      });
    });
  });

  describe('ScanButton', () => {
    it('renders subtle slim progress bar without cms-fluid-track', () => {
      act(() => {
        root.render(
          <ScanButton disabled={false} scanning={true} elapsedSeconds={12} onClick={() => {}} />,
        );
      });

      expect(container.textContent).toContain('Analyzing document with BAAI/bge-m3 & Winnowing…');
      expect(container.textContent).toContain('00:12');

      // Verify old loud animation is NOT present
      expect(container.querySelector('.cms-fluid-track')).toBeNull();

      // Verify subtle micro progress bar is present
      const subtleProgress = container.querySelector('.archive-scan-progress');
      expect(subtleProgress).not.toBeNull();
    });

    it('renders ready state when not scanning', () => {
      act(() => {
        root.render(
          <ScanButton disabled={false} scanning={false} elapsedSeconds={0} onClick={() => {}} />,
        );
      });

      expect(container.textContent).toContain('Scan for Similarities');
    });
  });

  describe('DropZone', () => {
    it('renders compact icon container and upload instructions', () => {
      act(() => {
        root.render(
          <DropZone file={null} scanning={false} errorMessage="" onFileSelected={() => {}} />,
        );
      });

      expect(container.textContent).toContain('Drag & drop manuscript here');
      const iconWrapper = container.querySelector('.h-11.w-11');
      expect(iconWrapper).not.toBeNull();
    });

    it('renders clean selected file metadata with format badge', () => {
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
