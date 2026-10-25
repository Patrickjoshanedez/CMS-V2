import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CompileProposalModal from './CompileProposalModal';

const { mockCompileProposal, mockToastError, mockToastSuccess } = vi.hoisted(() => ({
  mockCompileProposal: vi.fn(),
  mockToastError: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

vi.mock('@/services/submissionService', () => ({
  default: { compileProposal: mockCompileProposal },
}));

vi.mock('sonner', () => ({
  toast: { error: mockToastError, success: mockToastSuccess },
}));

describe('CompileProposalModal', () => {
  let onClose;
  let onSuccess;

  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn();
    onSuccess = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderModal = (props = {}) =>
    render(
      <CompileProposalModal
        isOpen
        onClose={onClose}
        onSuccess={onSuccess}
        projectId="project-1"
        {...props}
      />,
    );

  it('uses the shared dialog shell and computes revised manuscript versions', () => {
    renderModal({ isRevision: true, currentVersion: 3 });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Submit Revised Chapters 1–3 Manuscript' }),
    ).toBeInTheDocument();
    expect(screen.getByText('v4')).toBeInTheDocument();
    expect(screen.getByLabelText('Revision Summary / Notes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Revised Manuscript (v4)' })).toBeDisabled();
  });

  it('rejects an unsupported file extension without enabling submission', () => {
    renderModal();
    const fileInput = screen.getByLabelText('Manuscript File (.docx or .pdf)');
    const invalidFile = new File(['plain text'], 'proposal.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(mockToastError).toHaveBeenCalledWith(
      'Please upload a Microsoft Word (.docx) or PDF (.pdf) file.',
    );
    expect(screen.getByRole('button', { name: 'Compile & Submit Manuscript' })).toBeDisabled();
  });

  it('submits the chosen file and trimmed remarks, then reports success and closes', async () => {
    mockCompileProposal.mockResolvedValue({ success: true });
    renderModal();
    const file = new File(['approved chapters'], 'proposal.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    fireEvent.change(screen.getByLabelText('Manuscript File (.docx or .pdf)'), {
      target: { files: [file] },
    });
    fireEvent.change(screen.getByLabelText('Submission Remarks (Optional)'), {
      target: { value: '  Adviser-ready draft  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compile & Submit Manuscript' }));

    await waitFor(() => expect(mockCompileProposal).toHaveBeenCalledTimes(1));
    const [projectId, formData] = mockCompileProposal.mock.calls[0];
    expect(projectId).toBe('project-1');
    expect(formData.get('file')).toBe(file);
    expect(formData.get('remarks')).toBe('Adviser-ready draft');
    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Compiled Chapters 1–3 Manuscript submitted successfully for Adviser endorsement!',
      );
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('prevents dismissal and keeps controls disabled while upload is active', async () => {
    let finishUpload;
    mockCompileProposal.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishUpload = resolve;
        }),
    );
    renderModal();
    const file = new File(['approved chapters'], 'proposal.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Manuscript File (.docx or .pdf)'), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Compile & Submit Manuscript' }));

    expect(
      await screen.findByRole('progressbar', { name: 'Manuscript upload progress' }),
    ).toHaveAttribute('aria-valuenow', '10');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close manuscript submission' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    finishUpload({ success: true });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
