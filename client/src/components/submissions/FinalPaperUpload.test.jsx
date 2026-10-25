import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import FinalPaperUpload from './FinalPaperUpload';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { uploadAcademic, uploadJournal, toastError } = vi.hoisted(() => ({
  uploadAcademic: vi.fn(),
  uploadJournal: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }));

vi.mock('@/hooks/useSubmissions', () => ({
  useUploadFinalAcademic: () => ({ mutateAsync: uploadAcademic, isPending: false }),
  useUploadFinalJournal: () => ({ mutateAsync: uploadJournal, isPending: false }),
}));

describe('FinalPaperUpload deadline handling', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    uploadAcademic.mockResolvedValue({});
    uploadJournal.mockResolvedValue({});
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  it('displays the scheduler due state and blocks an overdue upload when late submissions are closed', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();

    await act(async () => {
      root.render(
        <FinalPaperUpload
          projectId="project-1"
          deadlines={{ finalAcademic: past }}
          deadlinePolicies={{ finalAcademic: { allowLateSubmission: false } }}
        />,
      );
    });

    const status = container.querySelector('[data-testid="final-paper-deadline"]');
    expect(status?.getAttribute('data-status')).toBe('overdue');
    expect(status?.textContent).toContain('late uploads are closed');
    expect(container.querySelector('input[type="file"]')?.disabled).toBe(true);
    expect(uploadAcademic).not.toHaveBeenCalled();
  });

  it('sends a required late justification with the academic manuscript upload', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();

    await act(async () => {
      root.render(
        <FinalPaperUpload
          projectId="project-1"
          deadlines={{ finalAcademic: past }}
          deadlinePolicies={{ finalAcademic: { allowLateSubmission: true } }}
        />,
      );
    });

    const file = new File(['synthetic manuscript'], 'academic-paper.pdf', {
      type: 'application/pdf',
    });
    await act(async () => {
      fireEvent.change(container.querySelector('input[type="file"]'), {
        target: { files: [file] },
      });
      fireEvent.change(container.querySelector('[data-testid="late-paper-remarks"]'), {
        target: { value: 'Synthetic workflow test justification.' },
      });
    });

    const uploadButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Upload Full Academic Manuscript'),
    );
    expect(uploadButton?.disabled).toBe(false);

    await act(async () => uploadButton.click());

    expect(uploadAcademic).toHaveBeenCalledTimes(1);
    const payload = uploadAcademic.mock.calls[0][0];
    expect(payload.projectId).toBe('project-1');
    expect(payload.formData.get('file').name).toBe('academic-paper.pdf');
    expect(payload.formData.get('remarks')).toBe('Synthetic workflow test justification.');
  });

  it('rejects non-PDF and oversized files, then accepts and uploads a dropped PDF', async () => {
    await act(async () => {
      root.render(<FinalPaperUpload projectId="project-1" />);
    });

    const fileInput = container.querySelector('input[type="file"]');
    const invalidFile = new File(['not a pdf'], 'paper.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });
    });
    expect(toastError).toHaveBeenCalledWith('Please select a PDF file.');

    const oversizedFile = new File(['small fixture'], 'large-paper.pdf', {
      type: 'application/pdf',
    });
    Object.defineProperty(oversizedFile, 'size', { value: 50 * 1024 * 1024 + 1 });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });
    });
    expect(toastError).toHaveBeenCalledWith('File size exceeds the 50MB limit.');

    const acceptedFile = new File(['final manuscript'], 'final-manuscript.pdf', {
      type: 'application/pdf',
    });
    const dropZone = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Click to browse or drag PDF file here'),
    );
    await act(async () => {
      fireEvent.drop(dropZone, { dataTransfer: { files: [acceptedFile] } });
    });
    expect(container.textContent).toContain('final-manuscript.pdf');

    const uploadButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent.includes('Upload Full Academic Manuscript'),
    );
    await act(async () => uploadButton.click());
    expect(uploadAcademic).toHaveBeenCalledTimes(1);
    expect(uploadAcademic.mock.calls[0][0].formData.get('file')).toBe(acceptedFile);
  });
});
