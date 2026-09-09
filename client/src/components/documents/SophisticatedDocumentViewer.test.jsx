import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import SophisticatedDocumentViewer from './SophisticatedDocumentViewer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Mock docx-preview — it uses complex DOM/canvas operations unavailable in jsdom
vi.mock('docx-preview', () => ({
  renderAsync: vi.fn().mockResolvedValue(undefined),
}));

// Mock useSubmissions hook for revision diffing
vi.mock('@/hooks/useSubmissions', () => ({
  useSubmissionRevisionDiff: vi.fn().mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock global fetch for the DOCX binary retrieval
const mockArrayBuffer = new ArrayBuffer(8);
globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  arrayBuffer: () => Promise.resolve(mockArrayBuffer),
});

const mockDocxSubmission = {
  _id: 'sub-789',
  chapter: 1,
  version: 2,
  fileName: 'AgriPulse_Chapter1_Proposal.docx',
  fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  fileSize: 1048576,
  status: 'pending',
  createdAt: '2026-09-08T10:00:00.000Z',
};

const mockPdfSubmission = {
  _id: 'sub-pdf-001',
  chapter: 2,
  version: 1,
  fileName: 'AgriPulse_Chapter2_RRL.pdf',
  fileType: 'application/pdf',
  fileSize: 2097152,
  status: 'approved',
  createdAt: '2026-09-08T11:00:00.000Z',
};

describe('SophisticatedDocumentViewer', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      arrayBuffer: () => Promise.resolve(mockArrayBuffer),
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  const renderViewer = async (props = {}) => {
    await act(async () => {
      root.render(
        <SophisticatedDocumentViewer
          open={true}
          onOpenChange={vi.fn()}
          submission={mockDocxSubmission}
          portalTarget={false}
          {...props}
        />,
      );
    });
    return container;
  };

  it('renders null when open is false', async () => {
    await act(async () => {
      root.render(
        <SophisticatedDocumentViewer
          open={false}
          onOpenChange={vi.fn()}
          submission={mockDocxSubmission}
        />,
      );
    });
    expect(container.innerHTML).toBe('');
  });

  it('renders viewer dialog with document title and metadata', async () => {
    const el = await renderViewer();
    expect(el.textContent).toContain('Chapter 1: Problem Definition & Objectives');
    expect(el.textContent).toContain('AgriPulse_Chapter1_Proposal.docx');
    expect(el.textContent).toContain('v2');
  });

  it('calls onOpenChange when close button is clicked', async () => {
    const onOpenChange = vi.fn();
    const el = await renderViewer({ onOpenChange });
    const closeBtn = el.querySelector('button[aria-label="Close document viewer"]');
    expect(closeBtn).not.toBeNull();

    await act(async () => {
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders zoom controls for DOCX submissions', async () => {
    const el = await renderViewer();
    // Zoom controls only appear for DOCX (not PDF)
    expect(el.textContent).toContain('100%');
    const zoomInBtn = el.querySelector('button[aria-label="Zoom in"]');
    expect(zoomInBtn).not.toBeNull();

    await act(async () => {
      zoomInBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(el.textContent).toContain('115%');
  });

  it('fetches the raw DOCX binary from the streaming endpoint', async () => {
    await renderViewer();
    // Waits for the useEffect fetch to execute
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/submissions/sub-789/file',
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('renders a PDF iframe for PDF submissions without zoom controls', async () => {
    const el = await renderViewer({ submission: mockPdfSubmission });
    // Should render an iframe for PDF
    const iframe = el.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.src).toContain('/api/submissions/sub-pdf-001/file');
    // No zoom controls for PDF
    expect(el.querySelector('button[aria-label="Zoom in"]')).toBeNull();
  });

  it('shows metadata drawer when Details button is clicked', async () => {
    const el = await renderViewer();
    const detailsBtn = el.querySelector('button[aria-label="Toggle document details"]');
    expect(detailsBtn).not.toBeNull();

    await act(async () => {
      detailsBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(el.textContent).toContain('Manuscript Record');
    expect(el.textContent).toContain('Archival submission metadata');
  });
});
