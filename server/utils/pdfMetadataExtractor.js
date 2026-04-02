/**
 * PDF Metadata Extractor Utility
 *
 * Extracts title and abstract from academic papers using pattern matching.
 * Works best with standard academic paper formats.
 */

import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

/**
 * Extracts title and abstract from a PDF file.
 *
 * @param {Buffer} pdfBuffer - PDF file buffer
 * @returns {Promise<{title: string, abstract: string, confidence: {title: number, abstract: number}}>}
 */
export async function extractPdfMetadata(pdfBuffer) {
  const data = await pdfParse(pdfBuffer);
  const text = data.text;

  if (!text || text.trim().length === 0) {
    logger.warn('PDF contains no extractable text');
    return { title: '', abstract: '', confidence: { title: 0, abstract: 0 } };
  }

  logger.info({ textLength: text.length, pages: data.numpages }, 'Extracting metadata from PDF');

  const title = extractTitle(text, data.info);
  const abstract = extractAbstract(text);

  return {
    title: title.value,
    abstract: abstract.value,
    confidence: {
      title: title.confidence,
      abstract: abstract.confidence,
    },
  };
}

/**
 * Extracts title from PDF text using multiple heuristics.
 */
function extractTitle(text, pdfInfo) {
  // First, check PDF metadata for title
  if (pdfInfo?.Title && pdfInfo.Title.trim().length > 5) {
    const metaTitle = cleanText(pdfInfo.Title);
    if (metaTitle.length > 10 && metaTitle.length < 300) {
      logger.debug({ source: 'metadata', title: metaTitle }, 'Title from PDF metadata');
      return { value: metaTitle, confidence: 0.9 };
    }
  }

  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // Strategy 1: Look for title before "Abstract" section
  const abstractIndex = findSectionIndex(lines, ['abstract', 'ABSTRACT']);
  if (abstractIndex > 0) {
    // Title is typically in the first few lines before abstract
    const candidateLines = lines.slice(0, Math.min(abstractIndex, 10));
    const title = findTitleFromLines(candidateLines);
    if (title) {
      logger.debug({ source: 'before-abstract', title }, 'Title before abstract');
      return { value: title, confidence: 0.8 };
    }
  }

  // Strategy 2: First substantial line that looks like a title
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i];
    if (isTitleCandidate(line)) {
      logger.debug(
        { source: 'first-substantial', title: line },
        'Title from first substantial line',
      );
      return { value: cleanText(line), confidence: 0.6 };
    }
  }

  // Strategy 3: Concatenate first few lines if they seem like a multi-line title
  const firstLines = lines.slice(0, 5);
  const multiLineTitle = findMultiLineTitle(firstLines);
  if (multiLineTitle) {
    logger.debug({ source: 'multi-line', title: multiLineTitle }, 'Multi-line title');
    return { value: multiLineTitle, confidence: 0.5 };
  }

  return { value: '', confidence: 0 };
}

/**
 * Extracts abstract from PDF text.
 */
function extractAbstract(text) {
  const lines = text.split('\n').map((l) => l.trim());

  // Find "Abstract" section
  const abstractPatterns = [
    /^abstract$/i,
    /^abstract[:\s]/i,
    /^ABSTRACT$/,
    /^A\s*B\s*S\s*T\s*R\s*A\s*C\s*T$/i, // Spaced out letters
  ];

  let abstractStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (abstractPatterns.some((p) => p.test(lines[i]))) {
      abstractStart = i;
      break;
    }
  }

  if (abstractStart === -1) {
    // Try to find abstract in continuous text
    const textLower = text.toLowerCase();
    const abstractMatch = textLower.match(
      /abstract[:\s\n]+(.+?)(?=\n\s*(?:introduction|keywords|key\s*words|1\.|1\s|i\.|i\s+introduction))/is,
    );
    if (abstractMatch && abstractMatch[1]) {
      const abstract = cleanText(abstractMatch[1]);
      if (abstract.length > 50 && abstract.length < 3000) {
        return { value: abstract, confidence: 0.7 };
      }
    }
    return { value: '', confidence: 0 };
  }

  // Find end of abstract section
  const endPatterns = [
    /^introduction$/i,
    /^1\.\s*introduction/i,
    /^i\.\s*introduction/i,
    /^keywords?[:\s]/i,
    /^key\s*words?[:\s]/i,
    /^index\s*terms?[:\s]/i,
    /^1\.\s+\w/,
    /^I\.\s+\w/,
    /^background$/i,
    /^related\s*work/i,
  ];

  let abstractEnd = lines.length;
  for (let i = abstractStart + 1; i < lines.length; i++) {
    if (endPatterns.some((p) => p.test(lines[i]))) {
      abstractEnd = i;
      break;
    }
  }

  // Extract lines between start and end
  const abstractLines = lines.slice(abstractStart + 1, abstractEnd);
  const abstract = abstractLines
    .filter((line) => line.length > 0 && !line.match(/^page\s*\d+$/i))
    .join(' ');

  const cleanedAbstract = cleanText(abstract);

  if (cleanedAbstract.length < 50) {
    return { value: '', confidence: 0 };
  }

  // Truncate if too long (max ~500 words / 3000 chars)
  const finalAbstract =
    cleanedAbstract.length > 3000 ? cleanedAbstract.substring(0, 3000) + '...' : cleanedAbstract;

  return { value: finalAbstract, confidence: 0.85 };
}

/**
 * Helper functions
 */

function findSectionIndex(lines, patterns) {
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase().trim();
    if (
      patterns.some(
        (p) =>
          lineLower === p.toLowerCase() ||
          lineLower.startsWith(p.toLowerCase() + ' ') ||
          lineLower.startsWith(p.toLowerCase() + ':'),
      )
    ) {
      return i;
    }
  }
  return -1;
}

function findTitleFromLines(lines) {
  // Skip common header elements
  const skipPatterns = [
    /^\d+$/, // Just numbers (page numbers)
    /^page\s*\d+$/i,
    /^vol\.\s*\d+/i,
    /^volume\s*\d+/i,
    /^\d{4}$/, // Year
    /^issn/i,
    /^isbn/i,
    /^doi:/i,
    /^http/i,
    /^www\./i,
    /^\d+\s*-\s*\d+$/, // Page range
    /^journal\s+of/i,
    /^international\s+journal/i,
    /^proceedings\s+of/i,
    /^conference/i,
    /^©/,
    /copyright/i,
  ];

  for (const line of lines) {
    if (line.length < 10 || line.length > 300) continue;
    if (skipPatterns.some((p) => p.test(line))) continue;
    if (isTitleCandidate(line)) {
      return cleanText(line);
    }
  }
  return null;
}

function isTitleCandidate(line) {
  if (line.length < 10 || line.length > 300) return false;

  // Titles typically don't end with periods (unless it's an acronym)
  if (line.endsWith('.') && !line.match(/\b[A-Z]{2,}\.$/) && line.split('.').length <= 2) {
    // Might be end of sentence, less likely title
  }

  // Titles are often in title case or all caps
  const words = line.split(/\s+/);
  const capitalizedWords = words.filter((w) => /^[A-Z]/.test(w));
  const ratio = capitalizedWords.length / words.length;

  // At least 60% capitalized words, or all caps
  if (ratio >= 0.6 || line === line.toUpperCase()) {
    // Skip if looks like author names (contains "and", multiple names)
    if (/\b(and|&)\b/i.test(line) && words.length <= 8) {
      return false;
    }
    return true;
  }

  return false;
}

function findMultiLineTitle(lines) {
  // Some titles span multiple lines - concatenate if they look connected
  const titleParts = [];
  for (const line of lines) {
    if (line.length < 5) continue;
    if (/^\d+$/.test(line)) continue;
    if (/^(by|author|department|university|college|school|faculty)/i.test(line)) break;
    if (/^(abstract|introduction)/i.test(line)) break;

    titleParts.push(line);
    if (titleParts.join(' ').length > 200) break;
    if (titleParts.length >= 3) break;
  }

  const combined = titleParts.join(' ');
  if (combined.length >= 15 && combined.length <= 300) {
    return cleanText(combined);
  }
  return null;
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s*-\s*/g, '-')
    .trim();
}

/**
 * Extract metadata from a file path.
 *
 * @param {string} filePath - Path to the PDF file
 * @returns {Promise<{title: string, abstract: string, confidence: {title: number, abstract: number}}>}
 */
export async function extractPdfMetadataFromFile(filePath) {
  const buffer = await fs.readFile(filePath);
  return extractPdfMetadata(buffer);
}
