import api from './api';

/**
 * Backward-compatible plagiarism service.
 *
 * Canonical hooks/pages use `plagiarismService.js`, while this file keeps
 * legacy imports working with the same axios client and auth behavior.
 */
export const plagiarismService = {
  getPlagiarismStatus: (submissionId) => api.get(`/submissions/${submissionId}/plagiarism`),
  getPlagiarismReport: (submissionId) => api.get(`/submissions/${submissionId}/plagiarism/report`),
  startPlagiarismCheck: (submissionId, payload) =>
    api.post(`/submissions/${submissionId}/plagiarism/check`, payload),
  getPlagiarismResult: (submissionId) => api.get(`/submissions/${submissionId}/plagiarism/result`),
  scanArchivedPdf: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/submissions/plagiarism/checker/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    });
  },
  scanArchive: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/submissions/plagiarism/checker/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    });
  },
  indexSubmissionInCorpus: (submissionId, payload) =>
    api.post(`/submissions/${submissionId}/plagiarism/index`, payload),
  removeFromCorpus: (submissionId) => api.delete(`/submissions/${submissionId}/plagiarism/index`),
};

export const startPlagiarismCheck = (submissionId, payload) =>
  plagiarismService.startPlagiarismCheck(submissionId, payload).then((response) => response.data);

export const getPlagiarismResult = (submissionId) =>
  plagiarismService
    .getPlagiarismResult(submissionId)
    .then((response) => response.data?.data || response.data);

export const indexSubmissionInCorpus = (submissionId, payload) =>
  plagiarismService
    .indexSubmissionInCorpus(submissionId, payload)
    .then((response) => response.data);

export const removeFromCorpus = (submissionId) =>
  plagiarismService.removeFromCorpus(submissionId).then((response) => response.data);

export const scanArchivedPdf = (file) =>
  plagiarismService.scanArchivedPdf(file).then((response) => response.data?.data || response.data);

export const scanArchive = (file) =>
  plagiarismService.scanArchive(file).then((response) => response.data?.data || response.data);

export async function pollPlagiarismResult(submissionId, maxAttempts = 60, intervalMs = 2000) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const result = await getPlagiarismResult(submissionId);
    const status = result?.status;

    if (status === 'completed') {
      return result;
    }

    if (status === 'failed') {
      throw new Error('Plagiarism check failed');
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts += 1;
  }

  throw new Error(`Plagiarism check timeout after ${maxAttempts * intervalMs}ms`);
}

export default plagiarismService;
