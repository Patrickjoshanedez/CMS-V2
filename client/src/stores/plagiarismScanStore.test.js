import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const scanArchiveMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/services/plagiarismService', () => ({
  plagiarismService: {
    scanArchive: (...args) => scanArchiveMock(...args),
    scanArchivedPdf: (...args) => scanArchiveMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args) => toastSuccessMock(...args),
    error: (...args) => toastErrorMock(...args),
  },
}));

import { usePlagiarismScanStore } from './plagiarismScanStore';

describe('usePlagiarismScanStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    usePlagiarismScanStore.getState().resetScan();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with default idle state', () => {
    const state = usePlagiarismScanStore.getState();
    expect(state.status).toBe('idle');
    expect(state.isScanning).toBe(false);
    expect(state.file).toBeNull();
    expect(state.elapsedSeconds).toBe(0);
    expect(state.reportData).toBeNull();
  });

  it('updates file and metadata via setFile', () => {
    const fakeFile = new File(['dummy content'], 'capstone_doc.pdf', { type: 'application/pdf' });
    usePlagiarismScanStore.getState().setFile(fakeFile);

    const state = usePlagiarismScanStore.getState();
    expect(state.file).toBe(fakeFile);
    expect(state.fileName).toBe('capstone_doc.pdf');
    expect(state.fileSize).toBe(fakeFile.size);
  });

  it('executes startArchiveScan, increments timer, and updates state on success', async () => {
    const fakeFile = new File(['content'], 'sample.pdf', { type: 'application/pdf' });
    const mockReport = {
      similarity_percentage: 12.5,
      originalityScore: 87.5,
      matchedSources: [],
      semanticModel: 'BAAI/bge-m3',
    };

    scanArchiveMock.mockResolvedValueOnce({
      data: {
        success: true,
        data: mockReport,
      },
    });

    const scanPromise = usePlagiarismScanStore.getState().startArchiveScan(fakeFile);

    expect(usePlagiarismScanStore.getState().isScanning).toBe(true);
    expect(usePlagiarismScanStore.getState().status).toBe('scanning');
    expect(usePlagiarismScanStore.getState().fileName).toBe('sample.pdf');

    // Fast-forward timer by 3 seconds
    vi.advanceTimersByTime(3000);
    expect(usePlagiarismScanStore.getState().elapsedSeconds).toBe(3);

    const result = await scanPromise;
    expect(result).toEqual(mockReport);
    expect(usePlagiarismScanStore.getState().isScanning).toBe(false);
    expect(usePlagiarismScanStore.getState().status).toBe('completed');
    expect(usePlagiarismScanStore.getState().reportData).toEqual(mockReport);

    expect(toastSuccessMock).toHaveBeenCalledWith(
      expect.stringContaining('Plagiarism scan completed for sample.pdf'),
      expect.objectContaining({
        description: 'Originality: 87.5%',
      }),
    );
  });

  it('handles scan errors, formats error message, and sets error status', async () => {
    const fakeFile = new File(['content'], 'bad.pdf', { type: 'application/pdf' });
    scanArchiveMock.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { message: 'Corrupt PDF document' },
      },
    });

    await expect(
      usePlagiarismScanStore.getState().startArchiveScan(fakeFile),
    ).rejects.toBeDefined();

    expect(usePlagiarismScanStore.getState().isScanning).toBe(false);
    expect(usePlagiarismScanStore.getState().status).toBe('error');
    expect(usePlagiarismScanStore.getState().scanError).toEqual({
      type: 'server',
      message: 'Corrupt PDF document',
    });
    expect(toastErrorMock).toHaveBeenCalledWith('Corrupt PDF document');
  });

  it('allows dismissing and resetting the scan', () => {
    usePlagiarismScanStore.getState().dismissProgressModal();
    expect(usePlagiarismScanStore.getState().isDismissed).toBe(true);

    usePlagiarismScanStore.getState().showProgressModal();
    expect(usePlagiarismScanStore.getState().isDismissed).toBe(false);

    usePlagiarismScanStore.getState().resetScan();
    expect(usePlagiarismScanStore.getState().status).toBe('idle');
  });
});
