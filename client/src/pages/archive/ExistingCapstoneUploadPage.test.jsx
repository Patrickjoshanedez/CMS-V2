import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ExistingCapstoneUploadPage from './ExistingCapstoneUploadPage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/archive/upload/capstone', state: { fromArchive: true } }),
}));

vi.mock('@/components/layouts/DashboardLayout', () => ({
  default: ({ children }) => <div data-testid="dashboard-layout">{children}</div>,
}));

const mockBulkUploadArchive = vi.fn();
let mockIsPending = false;
vi.mock('@/hooks/useProjects', () => ({
  useBulkUploadArchive: () => ({
    mutateAsync: mockBulkUploadArchive,
    isPending: mockIsPending,
  }),
}));

vi.mock('@/hooks/useAcademics', () => ({
  useAcademicYears: () => ({
    data: ['2025-2026', '2024-2025', '2023-2024'],
    isLoading: false,
  }),
}));

const mockUser = { role: 'instructor', name: 'Rozanne Tuesday Flores' };
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector) => {
    const state = { user: mockUser };
    return selector ? selector(state) : state;
  },
}));

const mockExtractPdfMetadata = vi.fn();
const mockSubmitMetadataFeedback = vi.fn();
const mockGetExtractionStatus = vi.fn();
vi.mock('@/services/metadataService', () => ({
  metadataService: {
    extractPdfMetadata: (...args) => mockExtractPdfMetadata(...args),
    submitMetadataFeedback: (...args) => mockSubmitMetadataFeedback(...args),
    getExtractionStatus: (...args) => mockGetExtractionStatus(...args),
  },
}));

const mockScanArchive = vi.fn();
const mockScanArchivedPdf = vi.fn();
vi.mock('@/services/plagiarismService', () => ({
  plagiarismService: {
    scanArchive: (...args) => mockScanArchive(...args),
    scanArchivedPdf: (...args) => mockScanArchivedPdf(...args),
  },
  scanArchive: (...args) => mockScanArchive(...args),
  scanArchivedPdf: (...args) => mockScanArchivedPdf(...args),
}));

const mockSocketHandlers = {};
const mockSocket = {
  on: vi.fn((event, handler) => {
    mockSocketHandlers[event] = handler;
  }),
  off: vi.fn((event) => {
    delete mockSocketHandlers[event];
  }),
};
vi.mock('@/services/socket', () => ({
  getSocket: () => mockSocket,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ExistingCapstoneUploadPage', () => {
  let container;
  let root;

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
    mockExtractPdfMetadata.mockResolvedValue({
      metadata: {
        title: 'Extracted Machine Learning Capstone',
        abstract: 'This is an extracted abstract describing deep learning.',
        authors: 'Añedez, P. J., Antipuesto, T.',
        year: '2026',
        doi: '10.1234/buksu.2026.01',
        venue: 'BukSU Capstone Proceedings',
        keywords: 'Deep Learning, OCR, Archival',
      },
      confidence: {
        title: 95,
        abstract: 90,
        authors: 88,
        year: 99,
        doi: 92,
        venue: 85,
        keywords: 89,
      },
    });

    mockScanArchive.mockResolvedValue({
      data: {
        originalityScore: 94.2,
        overallScore: 5.8,
        matchedSources: [],
        warningFlag: false,
      },
    });
    mockScanArchivedPdf.mockResolvedValue({
      data: {
        originalityScore: 94.2,
        overallScore: 5.8,
        matchedSources: [],
        warningFlag: false,
      },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    container?.remove();
  });

  it('renders page header with Back to Archive and document upload cards', () => {
    act(() => {
      root.render(<ExistingCapstoneUploadPage />);
    });

    expect(container.textContent).toContain('Back to Archive');
    expect(container.textContent).toContain('Browse Archive');
    expect(container.textContent).toContain('OCR Auto-Fill Capstone Upload');
    expect(container.textContent).toContain('Academic Paper (PDF)');
    expect(container.textContent).toContain('Academic Journal (PDF)');
    expect(container.textContent).toContain('Verify Metadata');
  });

  it('navigates back to /archive when clicking Back to Archive or Browse Archive', () => {
    act(() => {
      root.render(<ExistingCapstoneUploadPage />);
    });

    const backBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Back to Archive'),
    );
    expect(backBtn).toBeTruthy();

    act(() => {
      backBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/archive');

    const browseBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Browse Archive'),
    );
    expect(browseBtn).toBeTruthy();

    act(() => {
      browseBtn.click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/archive');
  });

  it('triggers OCR extraction when selecting an Academic Journal file', async () => {
    act(() => {
      root.render(<ExistingCapstoneUploadPage />);
    });

    const fileInputs = container.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBe(2);

    const journalFile = new File(['%PDF-mock-journal'], 'journal-paper.pdf', {
      type: 'application/pdf',
    });

    await act(async () => {
      const journalInput = fileInputs[1];
      Object.defineProperty(journalInput, 'files', {
        value: [journalFile],
        configurable: true,
      });
      journalInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(mockExtractPdfMetadata).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('journal-paper.pdf');
    expect(container.textContent).toContain('Active OCR Source');

    const titleInput = container.querySelector('#title');
    expect(titleInput.value).toBe('Extracted Machine Learning Capstone');

    const abstractInput = container.querySelector('#abstract');
    expect(abstractInput.value).toBe('This is an extracted abstract describing deep learning.');
  });

  it('triggers OCR extraction when selecting an Academic Paper file', async () => {
    act(() => {
      root.render(<ExistingCapstoneUploadPage />);
    });

    const fileInputs = container.querySelectorAll('input[type="file"]');
    const paperFile = new File(['%PDF-mock-paper'], 'full-manuscript.pdf', {
      type: 'application/pdf',
    });

    await act(async () => {
      const paperInput = fileInputs[0];
      Object.defineProperty(paperInput, 'files', {
        value: [paperFile],
        configurable: true,
      });
      paperInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(mockExtractPdfMetadata).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('full-manuscript.pdf');
    expect(container.textContent).toContain('Active OCR Source');

    const titleInput = container.querySelector('#title');
    expect(titleInput.value).toBe('Extracted Machine Learning Capstone');
  });

  it('submits successfully when only an Academic Journal is provided', async () => {
    act(() => {
      root.render(<ExistingCapstoneUploadPage />);
    });

    const fileInputs = container.querySelectorAll('input[type="file"]');
    const journalFile = new File(['%PDF-journal-only'], 'short-journal.pdf', {
      type: 'application/pdf',
    });

    await act(async () => {
      const journalInput = fileInputs[1];
      Object.defineProperty(journalInput, 'files', {
        value: [journalFile],
        configurable: true,
      });
      journalInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    mockBulkUploadArchive.mockResolvedValueOnce({
      project: { _id: 'proj-new-01' },
      message: 'Archive bundle uploaded successfully',
    });

    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Upload Archived Capstone Bundle'),
    );
    expect(submitBtn).toBeTruthy();

    await act(async () => {
      submitBtn.click();
    });

    expect(mockBulkUploadArchive).toHaveBeenCalledTimes(1);
    const submittedPayload = mockBulkUploadArchive.mock.calls[0][0];
    expect(submittedPayload.academicJournalFile).toBe(journalFile);
    expect(submittedPayload.academicPaperFile).toBeNull();
    expect(submittedPayload.title).toBe('Extracted Machine Learning Capstone');
  });

  it('handles asynchronous BullMQ extraction response and polls status to completion', async () => {
    act(() => {
      root.render(<ExistingCapstoneUploadPage />);
    });

    const fileInputs = container.querySelectorAll('input[type="file"]');
    const paperFile = new File(['%PDF-async-test'], 'async-paper.pdf', {
      type: 'application/pdf',
    });

    mockExtractPdfMetadata.mockResolvedValueOnce({
      status: 202,
      data: {
        status: 'queued',
        jobId: 'async-job-abc-123',
      },
    });

    mockGetExtractionStatus.mockResolvedValueOnce({
      data: {
        status: 'completed',
        data: {
          metadata: {
            title: 'Async BullMQ Extracted Title',
            abstract: 'Async extracted abstract with sufficient length for validation.',
            authors: 'Test Author',
            year: '2026',
            doi: '',
            venue: 'BukSU Capstone',
            keywords: 'Async, BullMQ',
          },
          confidence: {
            title: 92,
            abstract: 88,
          },
        },
      },
    });

    await act(async () => {
      const paperInput = fileInputs[0];
      Object.defineProperty(paperInput, 'files', {
        value: [paperFile],
        configurable: true,
      });
      paperInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(mockExtractPdfMetadata).toHaveBeenCalledTimes(1);

    // Wait for polling interval and state update
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1600));
    });

    expect(mockGetExtractionStatus).toHaveBeenCalledWith('async-job-abc-123');
    const titleInput = container.querySelector('input[name="title"]');
    expect(titleInput.value).toBe('Async BullMQ Extracted Title');
  });

  it('reliably extracts metadata when Socket.IO delivers ocr:complete with payload envelope', async () => {
    act(() => {
      root.render(<ExistingCapstoneUploadPage />);
    });

    const fileInputs = container.querySelectorAll('input[type="file"]');
    const paperFile = new File(['%PDF-remote-sensing'], 'remotesensing 17 02529 (1).pdf', {
      type: 'application/pdf',
    });

    mockExtractPdfMetadata.mockResolvedValueOnce({
      status: 202,
      data: {
        jobId: 'socket-job-mdpi-123',
        status: 'queued',
      },
    });

    await act(async () => {
      const paperInput = fileInputs[0];
      Object.defineProperty(paperInput, 'files', {
        value: [paperFile],
        configurable: true,
      });
      paperInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(mockExtractPdfMetadata).toHaveBeenCalledTimes(1);

    // Trigger the real-time Socket.IO ocr:complete event with payload envelope
    const ocrCompleteHandler = mockSocketHandlers['ocr:complete'];
    expect(ocrCompleteHandler).toBeTruthy();

    await act(async () => {
      ocrCompleteHandler({
        jobId: 'socket-job-mdpi-123',
        payload: {
          metadata: {
            title: 'Elevation-Aware Domain Adaptation for Sematic Segmentation of Aerial Images',
            abstract:
              'Recent advancements in Earth observation technologies have accelerated remote sensing...',
            authors: 'Zihao Sun, Peng Guo, Zehui Li, Xiuwan Chen, Xinbo Liu',
            year: '2025',
            doi: '10.3390/rs17142529',
            venue: 'Remote Sensing',
            keywords: 'unsupervised domain adaptation, semantic segmentation, remote sensing',
          },
          confidence: {
            title: 98,
            abstract: 85,
            authors: 98,
            year: 98,
            doi: 99,
            venue: 96,
            keywords: 80,
          },
        },
      });
    });

    const titleInput = container.querySelector('input[name="title"]');
    expect(titleInput.value).toBe(
      'Elevation-Aware Domain Adaptation for Sematic Segmentation of Aerial Images',
    );

    const abstractTextarea = container.querySelector('textarea[name="abstract"]');
    expect(abstractTextarea.value).toContain(
      'Recent advancements in Earth observation technologies',
    );

    const authorsInput = container.querySelector('input[name="authors"]');
    expect(authorsInput.value).toContain('Zihao Sun');

    const yearInput = container.querySelector('input[name="year"]');
    expect(yearInput.value).toBe('2025');

    const doiInput = container.querySelector('input[name="doi"]');
    expect(doiInput.value).toBe('10.3390/rs17142529');

    const venueInput = container.querySelector('input[name="venue"]');
    expect(venueInput.value).toBe('Remote Sensing');
  });

  it('allows uploading both Academic Paper and Academic Journal simultaneously with target selection and plagiarism scan', async () => {
    act(() => {
      root.render(<ExistingCapstoneUploadPage />);
    });

    const fileInputs = container.querySelectorAll('input[type="file"]');
    const paperFile = new File(['%PDF-paper'], 'thesis-manuscript.pdf', {
      type: 'application/pdf',
    });
    const journalFile = new File(['%PDF-journal'], 'ieee-article.pdf', {
      type: 'application/pdf',
    });

    // 1. Upload Academic Paper
    await act(async () => {
      const paperInput = fileInputs[0];
      Object.defineProperty(paperInput, 'files', {
        value: [paperFile],
        configurable: true,
      });
      paperInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // 2. Upload Academic Journal simultaneously
    await act(async () => {
      const journalInput = fileInputs[1];
      Object.defineProperty(journalInput, 'files', {
        value: [journalFile],
        configurable: true,
      });
      journalInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('thesis-manuscript.pdf');
    expect(container.textContent).toContain('ieee-article.pdf');
    expect(container.textContent).toContain('Dual Bundle (Paper + Journal)');

    // 3. Run plagiarism scan
    const scanPlagiarismBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Scan Paper for Plagiarism'),
    );
    expect(scanPlagiarismBtn).toBeTruthy();

    await act(async () => {
      scanPlagiarismBtn.click();
    });

    expect(mockScanArchive).toHaveBeenCalledWith(paperFile);
    expect(container.textContent).toContain('94.2% Original');
    expect(container.textContent).toContain('5.8% Similarity');

    // 4. Submit the dual bundle
    mockBulkUploadArchive.mockResolvedValueOnce({
      project: { _id: 'dual-proj-123' },
      message: 'Archived capstone bundle uploaded successfully.',
    });

    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Upload Archived Capstone Bundle'),
    );
    expect(submitBtn).toBeTruthy();

    await act(async () => {
      submitBtn.click();
    });

    expect(mockBulkUploadArchive).toHaveBeenCalledTimes(1);
    const submittedPayload = mockBulkUploadArchive.mock.calls[0][0];
    expect(submittedPayload.academicPaperFile).toBe(paperFile);
    expect(submittedPayload.academicJournalFile).toBe(journalFile);
    expect(submittedPayload.metadataTarget).toBe('academic_journal');
    expect(submittedPayload.plagiarismTarget).toBe('academic_paper');
    expect(submittedPayload.originalityScore).toBe(94.2);
  });

  it('allows removing an attached file cleanly', async () => {
    act(() => {
      root.render(<ExistingCapstoneUploadPage />);
    });

    const fileInputs = container.querySelectorAll('input[type="file"]');
    const paperFile = new File(['%PDF-paper'], 'removable-paper.pdf', {
      type: 'application/pdf',
    });

    await act(async () => {
      const paperInput = fileInputs[0];
      Object.defineProperty(paperInput, 'files', {
        value: [paperFile],
        configurable: true,
      });
      paperInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(container.textContent).toContain('removable-paper.pdf');

    const removeBtn = Array.from(container.querySelectorAll('button')).find(
      (b) =>
        b.textContent.includes('Remove') && b.getAttribute('title')?.includes('Academic Paper'),
    );
    expect(removeBtn).toBeTruthy();

    await act(async () => {
      removeBtn.click();
    });

    expect(container.textContent).toContain('No academic paper selected yet.');
  });
});
