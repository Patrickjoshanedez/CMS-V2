import { create } from 'zustand';
import { toast } from 'sonner';
import { plagiarismService } from '@/services/plagiarismService';

export const DEFAULT_SEMANTIC_MODEL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARCHIVE_SEMANTIC_MODEL) ||
  'BAAI/bge-m3';

let activeTimerId = null;

const initialScanState = {
  status: 'idle', // 'idle' | 'scanning' | 'completed' | 'error'
  isScanning: false,
  file: null,
  fileName: null,
  fileSize: null,
  elapsedSeconds: 0,
  scanError: null,
  reportData: null,
  semanticModel: DEFAULT_SEMANTIC_MODEL,
  isDismissed: false,
  scanType: null, // 'archive' | 'submission'
  submissionId: null,
  submissionTitle: null,
  submissionProgress: 0,
  submissionStage: '',
};

export const usePlagiarismScanStore = create((set, get) => ({
  ...initialScanState,

  setFile: (file) =>
    set({
      file,
      fileName: file?.name || null,
      fileSize: file?.size || null,
      scanError: null,
    }),

  setScanError: (error) => set({ scanError: error }),

  setSemanticModel: (model) => set({ semanticModel: model }),

  dismissProgressModal: () => set({ isDismissed: true }),

  showProgressModal: () => set({ isDismissed: false }),

  resetScan: () => {
    if (activeTimerId) {
      clearInterval(activeTimerId);
      activeTimerId = null;
    }
    set({ ...initialScanState });
  },

  startArchiveScan: async (file, options = {}) => {
    if (!file) return null;

    if (activeTimerId) {
      clearInterval(activeTimerId);
      activeTimerId = null;
    }

    set({
      status: 'scanning',
      isScanning: true,
      file,
      fileName: file.name,
      fileSize: file.size,
      elapsedSeconds: 0,
      scanError: null,
      reportData: null,
      isDismissed: false,
      scanType: 'archive',
      submissionId: null,
      submissionTitle: null,
    });

    activeTimerId = setInterval(() => {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }, 1000);

    try {
      const response = plagiarismService.scanArchive
        ? await plagiarismService.scanArchive(file)
        : await plagiarismService.scanArchivedPdf(file);

      const payload = response?.data?.data || response?.data || response || null;
      if (!payload) throw new Error('Scan response did not include report data.');

      if (activeTimerId) {
        clearInterval(activeTimerId);
        activeTimerId = null;
      }

      set({
        status: 'completed',
        isScanning: false,
        reportData: payload,
        semanticModel: payload.semanticModel || get().semanticModel,
      });

      // Trigger user completion notification
      const score = payload.originalityScore ?? payload.similarity_percentage ?? null;
      const scoreText = score !== null ? `Originality: ${score}%` : 'Analysis complete';
      toast.success(`Plagiarism scan completed for ${file.name}`, {
        description: scoreText,
        action: options.onViewReport
          ? {
              label: 'View Report',
              onClick: options.onViewReport,
            }
          : undefined,
        duration: 8000,
      });

      return payload;
    } catch (err) {
      if (activeTimerId) {
        clearInterval(activeTimerId);
        activeTimerId = null;
      }

      const status = Number(err?.response?.status);
      const message = String(err?.message || '').toLowerCase();
      const isClientTimeout = err?.code === 'ECONNABORTED' || message.includes('timeout');

      let formattedError;
      if (isClientTimeout) {
        formattedError = {
          type: 'server',
          message: 'Scan timed out. Please try again or verify network connectivity.',
        };
      } else if (status === 429) {
        formattedError = {
          type: 'server',
          message: 'Too many scans. Please wait before trying again.',
        };
      } else if (status >= 500) {
        formattedError = {
          type: 'server',
          message: 'Scan service unavailable. Try again shortly.',
        };
      } else {
        formattedError = {
          type: 'server',
          message:
            err?.response?.data?.message ||
            err?.message ||
            'Scan failed. Please check your document and try again.',
        };
      }

      set({
        status: 'error',
        isScanning: false,
        scanError: formattedError,
      });

      toast.error(formattedError.message);
      throw err;
    }
  },

  startSubmissionScan: ({ submissionId, title }) => {
    set({
      status: 'scanning',
      isScanning: true,
      scanType: 'submission',
      submissionId,
      submissionTitle: title || 'Submission Chapter',
      fileName: title || 'Submission Chapter',
      elapsedSeconds: 0,
      isDismissed: false,
    });
  },

  updateSubmissionProgress: ({ percent, stage }) => {
    set({
      submissionProgress: percent,
      submissionStage: stage,
    });
  },

  completeSubmissionScan: ({ title, result }) => {
    set({
      status: 'completed',
      isScanning: false,
      reportData: result,
    });
    toast.success(`Plagiarism check completed for ${title || 'submission'}`, {
      description:
        result?.originalityScore !== null && result?.originalityScore !== undefined
          ? `Originality: ${result.originalityScore}%`
          : 'Check complete',
      duration: 8000,
    });
  },
}));

export default usePlagiarismScanStore;
