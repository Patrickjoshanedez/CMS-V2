/**
 * Text Extraction Utility
 *
 * Extracts plain text from uploaded documents (PDF, DOCX) for plagiarism checking.
 * Uses appropriate libraries based on file type.
 *
 * Dependencies:
 *   npm install pdf-parse mammoth
 */

import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { AppError } from './AppError.js';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Extracts text from a file based on its MIME type.
 *
 * @param {string} filePath - Absolute path to the file
 * @param {string} mimeType - File MIME type (e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
 * @returns {Promise<string>} - Extracted plain text
 * @throws {AppError} - If file type is unsupported or extraction fails
 */
export async function extractTextFromFile(filePath, mimeType) {
  logger.info({ filePath, mimeType }, 'Extracting text from file');

  try {
    // Validate file exists
    await fs.access(filePath);

    // Route to appropriate extractor
    if (mimeType === 'application/pdf') {
      return await extractFromPDF(filePath);
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      return await extractFromDOCX(filePath);
    } else if (mimeType === 'text/plain') {
      return await extractFromTXT(filePath);
    } else {
      throw new AppError(
        `Unsupported file type for text extraction: ${mimeType}`,
        400,
        'UNSUPPORTED_FILE_TYPE',
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;

    logger.error({ error, filePath, mimeType }, 'Text extraction failed');
    throw new AppError(
      'Failed to extract text from document. The file may be corrupted.',
      500,
      'TEXT_EXTRACTION_FAILED',
    );
  }
}

/**
 * Extracts text from PDF using pdf-parse.
 */
async function extractFromPDF(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdfParse(dataBuffer);

  if (!data.text || data.text.trim().length === 0) {
    throw new AppError(
      'PDF appears to be empty or contains no extractable text (may be image-based).',
      400,
      'EMPTY_PDF',
    );
  }

  logger.info(
    { filePath, textLength: data.text.length, pages: data.numpages },
    'PDF text extracted',
  );

  return cleanExtractedText(data.text);
}

/**
 * Extracts text from DOCX using mammoth.
 */
async function extractFromDOCX(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });

  if (!result.value || result.value.trim().length === 0) {
    throw new AppError(
      'DOCX appears to be empty or contains no extractable text.',
      400,
      'EMPTY_DOCX',
    );
  }

  if (result.messages && result.messages.length > 0) {
    logger.warn({ filePath, messages: result.messages }, 'DOCX extraction warnings');
  }

  logger.info({ filePath, textLength: result.value.length }, 'DOCX text extracted');

  return cleanExtractedText(result.value);
}

/**
 * Extracts text from plain text files.
 */
async function extractFromTXT(filePath) {
  const text = await fs.readFile(filePath, 'utf-8');

  if (!text || text.trim().length === 0) {
    throw new AppError('Text file is empty.', 400, 'EMPTY_TXT');
  }

  logger.info({ filePath, textLength: text.length }, 'TXT text extracted');

  return cleanExtractedText(text);
}

/**
 * Cleans extracted text by removing excessive whitespace, control characters, etc.
 *
 * @param {string} text - Raw extracted text
 * @returns {string} - Cleaned text
 */
function cleanExtractedText(text) {
  return (
    text
      // Remove null bytes and control characters (except newline, tab, carriage return)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Collapse multiple spaces into one
      .replace(/ {2,}/g, ' ')
      // Collapse multiple newlines into max 2
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Extracts text and returns metadata about the extraction.
 *
 * @param {string} filePath - Absolute path to the file
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{text: string, length: number, wordCount: number}>}
 */
export async function extractTextWithMetadata(filePath, mimeType) {
  const text = await extractTextFromFile(filePath, mimeType);

  return {
    text,
    length: text.length,
    wordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

/**
 * Checks if a file type is supported for text extraction.
 *
 * @param {string} mimeType - File MIME type
 * @returns {boolean}
 */
export function isTextExtractionSupported(mimeType) {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
  ];

  return supportedTypes.includes(mimeType);
}
