import api from './api';

/**
 * Metadata API service — automated PDF metadata extraction & correction feedback.
 *
 * Dedicated domain service isolating document OCR processing from user auth and manuscript storage.
 */
export const metadataService = {
  /**
   * Extract capstone metadata and confidence scores from a PDF file.
   *
   * @param {File|Blob} file - The PDF file to extract metadata from
   * @returns {Promise<{data: {metadata: {title: string, abstract: string, authors: string, year: string, doi: string, venue: string, keywords: string}, confidence: Record<string, number>}}>}
   */
  extractPdfMetadata: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/documents/extract-pdf-metadata', formData, {
      timeout: 120000,
    });
  },

  /**
   * Store OCR field correction feedback for future extraction improvements.
   *
   * @param {object} payload - Feedback data containing corrected fields
   * @returns {Promise<any>}
   */
  submitMetadataFeedback: (payload) => {
    return api.post('/documents/metadata-feedback', payload);
  },
};

export default metadataService;
