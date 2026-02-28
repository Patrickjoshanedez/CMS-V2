/**
 * AWS S3 client configuration.
 * Provides a pre-configured S3Client instance used by StorageService.
 * Abstracted behind config so swapping providers only requires changes here.
 *
 * Local development uses LocalStack (http://localhost:4566) with
 * forcePathStyle to route requests as localhost:4566/bucket instead of
 * bucket.s3.amazonaws.com. In production the endpoint is omitted so
 * the SDK connects to real AWS.
 */
import { S3Client } from '@aws-sdk/client-s3';
import env from './env.js';

/** @type {import('@aws-sdk/client-s3').S3ClientConfig} */
const s3Config = {
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  // forcePathStyle ensures compatibility with LocalStack (localhost:4566/bucket)
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
};

// Point at LocalStack (or any S3-compatible endpoint) when configured
if (env.S3_ENDPOINT) {
  s3Config.endpoint = env.S3_ENDPOINT;
}

const s3Client = new S3Client(s3Config);

export { s3Client };
export default s3Client;
