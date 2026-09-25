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
    expect(container.textContent).toContain('Full Archive Index');
    expect(container.textContent).toContain('Winnowing Algorithm');
    expect(container.textContent).toContain('Semantic Embeddings');

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
});
