/**
 * server/services/documentConversion.service.js
 *
 * Headless document conversion service backed by Gotenberg (LibreOffice).
 * Converts OpenXML (.docx) manuscripts to PDF with exact font, margin,
 * and vector layout fidelity.
 */
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export class DocumentConversionService {
  constructor(gotenbergUrl = process.env.GOTENBERG_URL || 'http://localhost:3000') {
    this.gotenbergUrl = gotenbergUrl.replace(/\/+$/, '');
  }

  /**
   * Checks whether the Gotenberg conversion microservice is reachable and healthy.
   *
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${this.gotenbergUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Converts a DOCX buffer to a PDF buffer using Gotenberg's LibreOffice endpoint.
   *
   * @param {Buffer|ArrayBuffer|Uint8Array} docxBuffer - Raw DOCX binary buffer.
   * @param {string} [filename='document.docx'] - Original filename.
   * @returns {Promise<Buffer>} Converted PDF binary buffer.
   */
  async convertDocxToPdf(docxBuffer, filename = 'document.docx') {
    if (!docxBuffer || (Buffer.isBuffer(docxBuffer) && docxBuffer.length === 0)) {
      throw new Error('DOCX buffer is empty or invalid.');
    }

    const safeFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
    const formData = new FormData();
    const blob = new Blob([docxBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    formData.append('files', blob, safeFilename);

    const controller = new AbortController();
    const timeoutMs = parseInt(process.env.CONVERSION_TIMEOUT_MS || '60000', 10);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.gotenbergUrl}/forms/libreoffice/convert`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown conversion error');
        throw new Error(`Gotenberg conversion failed (HTTP ${response.status}): ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      logger.info(
        { filename: safeFilename, pdfSize: arrayBuffer.byteLength },
        '[DocumentConversion] Successfully converted DOCX to PDF',
      );
      return Buffer.from(arrayBuffer);
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error(`Document conversion timed out after ${timeoutMs}ms.`);
      }
      logger.error(
        { err: err.message, filename: safeFilename },
        '[DocumentConversion] Conversion failed',
      );
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const documentConversionService = new DocumentConversionService();
export default documentConversionService;
