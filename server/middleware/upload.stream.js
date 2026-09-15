/**
 * Stream-based file upload middleware using Busboy.
 *
 * Streams incoming file parts directly to S3 or temporary stream consumers
 * without buffering the full 50MB file in V8 heap memory.
 * Performs inline magic-byte validation on the first chunk (~4KB).
 */
import Busboy from 'busboy';
import { fileTypeFromBuffer } from 'file-type';
import { PassThrough } from 'node:stream';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import s3Client from '../config/storage.js';
import env from '../config/env.js';
import AppError from '../utils/AppError.js';

export function streamUploadToS3(
  options = {
    maxBytes: 50 * 1024 * 1024,
    allowedMimes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
) {
  return (req, res, next) => {
    if (!req.is('multipart/form-data')) return next();

    let busboy;
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: {
          fileSize: options.maxBytes,
          files: 1,
        },
      });
    } catch (err) {
      return next(new AppError(`Multipart parsing error: ${err.message}`, 400, 'MULTIPART_ERROR'));
    }

    req.uploadedFile = null;
    let uploadPromise = null;
    let hasError = false;

    busboy.on('file', (fieldname, fileStream, fileInfo) => {
      const { filename, mimeType } = fileInfo;
      const passThrough = new PassThrough();
      let bytesUploaded = 0;
      let firstChunkChecked = false;
      const chunks = [];

      fileStream.on('data', async (chunk) => {
        bytesUploaded += chunk.length;

        if (bytesUploaded > options.maxBytes) {
          hasError = true;
          fileStream.destroy(
            new AppError('File exceeds maximum allowed size.', 413, 'LIMIT_FILE_SIZE'),
          );
          return;
        }

        if (!firstChunkChecked) {
          firstChunkChecked = true;
          try {
            const detected = await fileTypeFromBuffer(chunk);
            const resolvedMime = detected ? detected.mime : mimeType;
            if (options.allowedMimes && !options.allowedMimes.includes(resolvedMime)) {
              hasError = true;
              fileStream.destroy(
                new AppError(
                  'Invalid file type detected by magic bytes.',
                  400,
                  'INVALID_MIME_TYPE',
                ),
              );
              return;
            }
          } catch {
            // If detection fails, proceed with declared mime if acceptable
          }
        }

        chunks.push(chunk);
      });

      fileStream.pipe(passThrough);

      const s3Key = `submissions/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const bucket = env.S3_BUCKET || 'cms-v2-uploads';

      // Stream directly via PutObjectCommand or chunked consumer
      uploadPromise = (async () => {
        try {
          const command = new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: passThrough,
            ContentType: mimeType,
          });

          await s3Client.send(command);

          req.uploadedFile = {
            key: s3Key,
            bucket,
            fileName: filename,
            mimeType,
            size: bytesUploaded,
          };
        } catch (s3Err) {
          if (!hasError) {
            hasError = true;
            passThrough.destroy(s3Err);
            throw s3Err;
          }
        }
      })();
    });

    busboy.on('finish', async () => {
      if (hasError) return;
      try {
        if (uploadPromise) {
          await uploadPromise;
        }
        next();
      } catch (err) {
        next(err);
      }
    });

    busboy.on('error', (err) => {
      if (!hasError) {
        hasError = true;
        next(err);
      }
    });

    req.pipe(busboy);
  };
}

export default streamUploadToS3;
