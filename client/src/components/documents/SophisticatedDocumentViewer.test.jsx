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

vi.mock('@/components/submissions/PdfViewerWorkspace', () => ({
  default: ({ pdfUrl, highlights }) => (
    <div data-testid="mock-pdf-viewer-workspace" data-pdf-url={pdfUrl}>
      Mock PDF Viewer Workspace ({highlights?.length || 0} highlights)
    </div>
  ),
}));

import api from '@/services/api';
import { submissionService } from '@/services/submissionService';

const mockArrayBuffer = new ArrayBuffer(8);

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn().mockImplementation((url) => {
      if (url.includes('/file')) {
        return Promise.resolve({ data: mockArrayBuffer });
      }
      return Promise.resolve({ data: {} });
    }),
  },
}));

vi.mock('@/services/submissionService', () => ({
  submissionService: {
    downloadFile: vi.fn().mockResolvedValue(undefined),
    getFile: vi.fn().mockResolvedValue({ data: new Blob() }),
  },
}));

// Mock global fetch for external pre-signed URL retrieval
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

  it('supports zoom presets 150%, 200%, 250%, and 300%', async () => {
    const el = await renderViewer();
    const zoom150Btn = el.querySelector('button[aria-label="Zoom 150%"]');
    const zoom200Btn = el.querySelector('button[aria-label="Zoom 200%"]');
    const zoom250Btn = el.querySelector('button[aria-label="Zoom 250%"]');
    const zoom300Btn = el.querySelector('button[aria-label="Zoom 300%"]');

    expect(zoom150Btn).not.toBeNull();
    expect(zoom200Btn).not.toBeNull();
    expect(zoom250Btn).not.toBeNull();
    expect(zoom300Btn).not.toBeNull();

    await act(async () => {
      zoom150Btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(el.textContent).toContain('150%');

    await act(async () => {
      zoom300Btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(el.textContent).toContain('300%');
  });

  it('fetches the raw DOCX binary from the streaming endpoint via authenticated api client', async () => {
    await renderViewer();
    // Waits for the useEffect fetch to execute
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(api.get).toHaveBeenCalledWith(
      '/submissions/sub-789/file',
      expect.objectContaining({ responseType: 'arraybuffer' }),
    );
  });

  it('renders PdfViewerWorkspace for PDF submissions without zoom controls', async () => {
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-pdf-url');
    }
    const el = await renderViewer({ submission: mockPdfSubmission });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    // Should render PdfViewerWorkspace for PDF
    const workspace = el.querySelector('[data-testid="mock-pdf-viewer-workspace"]');
    expect(workspace).not.toBeNull();
    // No zoom controls for PDF
    expect(el.querySelector('button[aria-label="Zoom in"]')).toBeNull();
  });

  it('renders a PDF iframe for PDF submissions when useLegacyIframe is true', async () => {
    if (!globalThis.URL.createObjectURL) {
      globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-pdf-url');
    }
    const el = await renderViewer({ submission: mockPdfSubmission, useLegacyIframe: true });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const iframe = el.querySelector('iframe');
    expect(iframe).not.toBeNull();
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

  it('renders inline directly into the DOM tree when embedded is true without modal backdrop', async () => {
    await act(async () => {
      root.render(
        <SophisticatedDocumentViewer
          embedded={true}
          submission={mockDocxSubmission}
          portalTarget={false}
        />,
      );
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).toContain('Chapter 1: Problem Definition & Objectives');
    expect(container.textContent).toContain('Revision Diff (+/-)');
  });
});
