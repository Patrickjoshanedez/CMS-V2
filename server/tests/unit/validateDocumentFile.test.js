import { describe, expect, it, vi } from 'vitest';
import AppError from '../../utils/AppError.js';
import { validateDocumentFile } from '../../middleware/fileValidation.js';
import env from '../../config/env.js';

describe('validateDocumentFile middleware', () => {
  it('returns 400 NO_FILE if req.file is missing', async () => {
    const req = {};
    const next = vi.fn();

    await validateDocumentFile(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('NO_FILE');
  });

  it('returns 413 FILE_TOO_LARGE if file exceeds MAX_UPLOAD_SIZE_MB', async () => {
    const maxBytes = env.MAX_UPLOAD_SIZE_MB * 1024 * 1024;
    const req = {
      file: {
        buffer: Buffer.from('%PDF-1.4 test'),
        originalname: 'test.pdf',
        size: maxBytes + 1,
      },
    };
    const next = vi.fn();

    await validateDocumentFile(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(413);
    expect(err.code).toBe('FILE_TOO_LARGE');
  });

  it('accepts a valid PDF file with PDF magic bytes', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
    const req = {
      file: {
        buffer: pdfBuffer,
        originalname: 'manuscript.pdf',
        size: pdfBuffer.length,
      },
    };
    const next = vi.fn();

    await validateDocumentFile(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.file.validatedMime).toBe('application/pdf');
  });

  it('accepts a valid DOCX file (ZIP archive signature) with .docx extension', async () => {
    // DOCX files are zip archives starting with PK\x03\x04
    // Construct a minimal valid zip header
    const zipHeader = Buffer.from([
      0x50,
      0x4b,
      0x03,
      0x04,
      0x0a,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x04,
      0x00,
      0x00,
      0x00,
      0x74,
      0x65,
      0x73,
      0x74, // filename "test"
    ]);
    const req = {
      file: {
        buffer: zipHeader,
        originalname: 'research_proposal.docx',
        size: zipHeader.length,
      },
    };
    const next = vi.fn();

    await validateDocumentFile(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.file.validatedMime).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
  });

  it('rejects invalid file types like images or executables', async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const req = {
      file: {
        buffer: pngBuffer,
        originalname: 'photo.png',
        size: pngBuffer.length,
      },
    };
    const next = vi.fn();

    await validateDocumentFile(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('INVALID_FILE_TYPE');
  });
});
