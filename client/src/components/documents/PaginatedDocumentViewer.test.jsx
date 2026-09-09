import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import PaginatedDocumentViewer from './PaginatedDocumentViewer';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('docx-preview', () => ({
  renderAsync: vi.fn().mockResolvedValue(true),
}));

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  });
});

describe('PaginatedDocumentViewer', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('renders top toolbar with page indicator and zoom controls', () => {
    act(() => {
      root.render(
        <PaginatedDocumentViewer
          fileUrl="http://localhost:43210/api/submissions/sub-1/file"
          fileName="Thesis_Draft.docx"
          fileType="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        />,
      );
    });

    const viewer = container.querySelector('[data-testid="paginated-document-viewer"]');
    expect(viewer).not.toBeNull();
    expect(viewer.textContent).toContain('Word OOXML High-Fidelity');
    expect(viewer.textContent).toContain('Thesis_Draft.docx');
    expect(viewer.textContent).toContain('Page 1 of 1');
    expect(viewer.textContent).toContain('100%');
  });

  it('renders iframe when given a PDF file', () => {
    act(() => {
      root.render(
        <PaginatedDocumentViewer
          fileUrl="http://localhost:43210/api/submissions/sub-1/file"
          fileName="Approved_Manuscript.pdf"
          fileType="application/pdf"
        />,
      );
    });

    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('title')).toBe('PDF Document Reader');
    expect(container.textContent).toContain('PDF Locked-In');
  });

  it('allows interactive zoom adjustment and reset', () => {
    const onZoomChange = vi.fn();

    act(() => {
      root.render(
        <PaginatedDocumentViewer
          fileUrl="http://localhost:43210/api/submissions/sub-1/file"
          fileName="Draft.docx"
          zoom={100}
          onZoomChange={onZoomChange}
        />,
      );
    });

    const zoomInBtn = container.querySelector('button[title="Zoom In"]');
    expect(zoomInBtn).not.toBeNull();

    act(() => {
      zoomInBtn.click();
    });
    expect(onZoomChange).toHaveBeenCalledWith(110);

    const zoomOutBtn = container.querySelector('button[title="Zoom Out"]');
    expect(zoomOutBtn).not.toBeNull();

    act(() => {
      zoomOutBtn.click();
    });
    expect(onZoomChange).toHaveBeenCalledWith(90);

    const resetZoomBtn = container.querySelector('button[title="Reset Zoom"]');
    expect(resetZoomBtn).not.toBeNull();

    act(() => {
      resetZoomBtn.click();
    });
    expect(onZoomChange).toHaveBeenCalledWith(100);
  });
});
