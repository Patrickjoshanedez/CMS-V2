/**
 * Text extraction utility — extracts plain text from uploaded documents.
 *
 * Supports:
 *   - PDF  (application/pdf)           → via pdf-parse
 *   - DOCX (application/vnd.openxml…)  → via mammoth
 *   - TXT  (text/plain)                → direct buffer decode
 *
 * The extracted text is used for plagiarism/originality comparison.
 *
 * @module utils/extractText
 */

/**
 * Extract plain text from a file buffer based on its MIME type.
 *
 * @param {Buffer} buffer   - The raw file buffer
 * @param {string} mimeType - The validated MIME type of the file
 * @returns {Promise<string>} Extracted plain text content
 * @throws {Error} If the MIME type is unsupported or extraction fails
 */
export async function extractText(buffer, mimeType) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Cannot extract text from an empty buffer.');
  }

  const mime = mimeType.toLowerCase().trim();

  switch (mime) {
    case 'application/pdf':
      return extractFromPdf(buffer);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractFromDocx(buffer);

    case 'text/plain':
      return buffer.toString('utf-8');

    default:
      throw new Error(`Unsupported MIME type for text extraction: ${mimeType}`);
  }
}

/**
 * Extract text from a PDF buffer using pdf-parse.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractFromPdf(buffer) {
  // pdf-parse v2 exposes a PDFParse class, not a default function.
  // Construct a parser per call and destroy it to avoid leaked resources.
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result?.text || '';
  } finally {
    await parser.destroy();
  }
}

/**
 * Extract text from a DOCX buffer using mammoth.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractFromDocx(buffer) {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
}

export default { extractText };
