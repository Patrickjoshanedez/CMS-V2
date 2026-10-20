import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import FinalPaperUpload from './FinalPaperUpload';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { uploadAcademic, uploadJournal } = vi.hoisted(() => ({
  uploadAcademic: vi.fn(),
  uploadJournal: vi.fn(),
}));

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
});
