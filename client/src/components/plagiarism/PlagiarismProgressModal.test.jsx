import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PlagiarismProgressModal } from './PlagiarismProgressModal';
import { usePlagiarismScanStore } from '@/stores/plagiarismScanStore';

const mockNavigate = vi.fn();
let mockLocation = { pathname: '/dashboard' };

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

let mockSocketHandler = null;
vi.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    on: (event, handler) => {
      if (event === 'plagiarism:progress') {
        mockSocketHandler = handler;
      }
    },
    off: vi.fn(),
  }),
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('PlagiarismProgressModal', () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    mockNavigate.mockClear();
    mockLocation = { pathname: '/dashboard' };
    usePlagiarismScanStore.getState().resetScan();

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

  it('renders nothing when no scan is active', () => {
    act(() => {
      root.render(<PlagiarismProgressModal />);
    });

    expect(container.innerHTML).toBe('');
  });

  it('renders background floating modal when archive scan is running and user is on another page', () => {
    usePlagiarismScanStore.setState({
      status: 'scanning',
      isScanning: true,
      fileName: 'final_capstone_manuscript.pdf',
      elapsedSeconds: 15,
      isDismissed: false,
    });

    act(() => {
      root.render(<PlagiarismProgressModal />);
    });

    const modal = container.querySelector('[data-testid="background-plagiarism-floating-modal"]');
    expect(modal).not.toBeNull();
    expect(container.textContent).toContain('Archive Integrity Scan');
    expect(container.textContent).toContain('final_capstone_manuscript.pdf');
    expect(container.textContent).toContain('00:15');
    expect(container.textContent).toContain('Return to Scan');

    // Click Return to Scan
    const returnBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Return to Scan'),
    );
    expect(returnBtn).not.toBeNull();
    act(() => {
      returnBtn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/plagiarism');
  });

  it('hides the floating modal when user is currently on /plagiarism', () => {
    mockLocation = { pathname: '/plagiarism' };
    usePlagiarismScanStore.setState({
      status: 'scanning',
      isScanning: true,
      fileName: 'draft.docx',
      elapsedSeconds: 5,
      isDismissed: false,
    });

    act(() => {
      root.render(<PlagiarismProgressModal />);
    });

    expect(
      container.querySelector('[data-testid="background-plagiarism-floating-modal"]'),
    ).toBeNull();
  });

  it('renders completion state with View Report button when archive scan finishes', () => {
    usePlagiarismScanStore.setState({
      status: 'completed',
      isScanning: false,
      fileName: 'thesis.pdf',
      reportData: {
        originalityScore: 92,
      },
      isDismissed: false,
    });

    act(() => {
      root.render(<PlagiarismProgressModal />);
    });

    expect(container.textContent).toContain('Archive Integrity Scan');
    expect(container.textContent).toContain('Originality Score');
    expect(container.textContent).toContain('92%');

    const viewReportBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('View Report'),
    );
    expect(viewReportBtn).not.toBeNull();
    act(() => {
      viewReportBtn.click();
    });
    expect(mockNavigate).toHaveBeenCalledWith('/plagiarism');
  });

  it('allows dismissing the floating modal', () => {
    usePlagiarismScanStore.setState({
      status: 'scanning',
      isScanning: true,
      fileName: 'doc.pdf',
      isDismissed: false,
    });

    act(() => {
      root.render(<PlagiarismProgressModal />);
    });

    const dismissBtn = container.querySelector('button[aria-label="Dismiss scan notification"]');
    expect(dismissBtn).not.toBeNull();
    act(() => {
      dismissBtn.click();
    });

    expect(usePlagiarismScanStore.getState().isDismissed).toBe(true);
  });

  it('renders socket scan progress with the shared accessible Progress primitive', () => {
    act(() => {
      root.render(<PlagiarismProgressModal />);
    });

    act(() => {
      mockSocketHandler({ percent: 37, stage: 'Comparing manuscript passages' });
    });

    const modal = container.querySelector('[data-testid="socket-plagiarism-floating-modal"]');
    expect(modal).not.toBeNull();
    expect(modal.textContent).toContain('Comparing manuscript passages');
    const progress = modal.querySelector('[role="progressbar"]');
    expect(progress.getAttribute('aria-label')).toBe('Plagiarism scan progress');
    expect(progress.getAttribute('aria-valuenow')).toBe('37');
  });
});
