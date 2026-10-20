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

const hasStaticS3Credentials =
  typeof env.S3_ACCESS_KEY_ID === 'string' &&
  env.S3_ACCESS_KEY_ID.trim().length > 0 &&
  typeof env.S3_SECRET_ACCESS_KEY === 'string' &&
  env.S3_SECRET_ACCESS_KEY.trim().length > 0;

/** @type {import('@aws-sdk/client-s3').S3ClientConfig} */
const baseS3Config = {
  region: env.S3_REGION,
  // forcePathStyle ensures compatibility with LocalStack (localhost:4566/bucket)
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
};

if (hasStaticS3Credentials) {
  baseS3Config.credentials = {
    accessKeyId: env.S3_ACCESS_KEY_ID.trim(),
    secretAccessKey: env.S3_SECRET_ACCESS_KEY.trim(),
  };
}

/** Create an S3 client that signs requests for the supplied browser-reachable endpoint. */
export const createStorageS3Client = (endpointOverride) => {
  const s3Config = { ...baseS3Config };
  const endpoint = endpointOverride || env.S3_ENDPOINT;
  if (endpoint) s3Config.endpoint = endpoint;
  return new S3Client(s3Config);
};

const s3Client = createStorageS3Client();

export { s3Client };
export default s3Client;
