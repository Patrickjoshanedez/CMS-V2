/**
 * AWS S3 client configuration.
 * Provides a pre-configured S3Client instance used by StorageService.
 * Abstracted behind config so swapping providers only requires changes here.
 */
import { S3Client } from '@aws-sdk/client-s3';
import env from './env.js';

const s3Client = new S3Client({
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

export { s3Client };
export default s3Client;
