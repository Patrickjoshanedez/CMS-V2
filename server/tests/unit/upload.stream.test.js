import { describe, it, expect, vi } from 'vitest';
import streamUploadMiddleware from '../../middleware/upload.stream.js';
import stream from 'stream';

describe('Phase 3: Zero-Memory Streaming Upload Middleware', () => {
  it('instantiates the middleware and passes through non-multipart requests', () => {
    const middleware = streamUploadMiddleware();
    const req = {
      is: (type) => false,
      headers: {},
    };
    const res = {};
    let nextCalled = false;
    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
  });

  it('rejects files with invalid file signatures', async () => {
    const middleware = streamUploadMiddleware();
    const mockReq = new stream.PassThrough();
    mockReq.headers = {
      'content-type': 'multipart/form-data; boundary=----BoundaryTest',
    };
    mockReq.is = (type) => type === 'multipart/form-data';

    const boundary = '----BoundaryTest';
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="chapter"',
      '',
      '1',
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="malicious.pdf"',
      'Content-Type: application/pdf',
      '',
      'INVALID_NOT_PDF_HEADER_CONTENT_BYTES',
      `--${boundary}--`,
      '',
    ].join('\r\n');

    let nextError = null;
    middleware(mockReq, {}, (err) => {
      nextError = err;
    });

    mockReq.end(Buffer.from(payload));

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(nextError).not.toBeNull();
    expect(nextError.statusCode).toBe(400);
    expect(nextError.message).toContain('Invalid file signature');
  });
});
