import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ArchivePlagiarismCheckerPage from './ArchivePlagiarismCheckerPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/services/plagiarismService', () => ({
  plagiarismService: {
    getHealth: vi.fn().mockResolvedValue({
      status: 'healthy',
      models: { semantic: 'BAAI/bge-m3' },
    }),
    checkDirectText: vi.fn(),
  },
}));

describe('ArchivePlagiarismCheckerPage', () => {
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

  it('renders normalized page header, dropzone, how it works, and institutional disclaimer', async () => {
    await act(async () => {
      root.render(<ArchivePlagiarismCheckerPage />);
    });

    // Check page title and badges
    expect(container.textContent).toContain('Plagiarism & Similarity Checker');
    expect(container.textContent).toContain('Archive Integrity Scan');
    expect(container.textContent).toContain('lexical fingerprinting (Winnowing)');
    expect(container.textContent).toContain('dense vector embeddings');

    // Check upload section
    expect(container.textContent).toContain('Upload Document');
    expect(container.textContent).toContain('Drag & drop manuscript here');
    expect(container.textContent).toContain('Scan for Similarities');

    // Check How It Works section
    expect(container.textContent).toContain('How It Works');
    expect(container.textContent).toContain('Dual-Engine Comparison');
    expect(container.textContent).toContain('Review Originality Intelligence');

    // Check institutional disclaimer
    expect(container.textContent).toContain(
      'Manuscript scans are verified against all approved institutional capstones',
    );
  });

  it('toggles How It Works guide collapse and expansion state', async () => {
    await act(async () => {
      root.render(<ArchivePlagiarismCheckerPage />);
    });

    const toggleBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('How It Works'),
    );
    expect(toggleBtn).not.toBeNull();
    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(container.textContent).toContain('Dual-Engine Comparison');

    // Click to collapse
    await act(async () => {
      toggleBtn.click();
    });

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('false');
    expect(toggleBtn.textContent).toContain('Show guide');
    expect(container.textContent).not.toContain('Dual-Engine Comparison');

    // Click to re-expand
    await act(async () => {
      toggleBtn.click();
    });

    expect(toggleBtn.getAttribute('aria-expanded')).toBe('true');
    expect(toggleBtn.textContent).toContain('Hide guide');
    expect(container.textContent).toContain('Dual-Engine Comparison');
  });

  it('rejects zip archives and invalid documents with validation error', async () => {
    await act(async () => {
      root.render(<ArchivePlagiarismCheckerPage />);
    });

    const input = container.querySelector('input[type="file"]');
    expect(input).not.toBeNull();

    const zipFile = new File(['fake zip content'], 'project_archive.zip', {
      type: 'application/zip',
    });

    await act(async () => {
      input.dispatchEvent(
        new Event('change', {
          bubbles: true,
        }),
      );
      // Trigger file change through input
      Object.defineProperty(input, 'files', {
        value: [zipFile],
        writable: true,
      });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('Only PDF and Word (.docx) files are accepted.');
  });
});
