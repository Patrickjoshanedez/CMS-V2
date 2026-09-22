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
});
