import { useMutation } from '@tanstack/react-query';
import { metadataService } from '@/services/metadataService';

/**
 * Mutation hook to extract PDF metadata and confidence scores.
 *
 * @param {object} options - React Query mutation options
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useExtractPdfMetadata(options = {}) {
  return useMutation({
    mutationFn: async (file) => {
      const res = await metadataService.extractPdfMetadata(file);
      return res.data;
    },
    ...options,
  });
}

/**
 * Mutation hook to submit metadata correction feedback.
 *
 * @param {object} options - React Query mutation options
 * @returns {import('@tanstack/react-query').UseMutationResult}
 */
export function useSubmitMetadataFeedback(options = {}) {
  return useMutation({
    mutationFn: async (payload) => {
      const res = await metadataService.submitMetadataFeedback(payload);
      return res.data;
    },
    ...options,
  });
}
