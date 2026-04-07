import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { STORAGE_BUCKETS } from '@cms/shared';

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const repoRoot = path.resolve(currentDir, '..', '..', '..');

const readRepoTextFile = (relativePath) =>
  readFileSync(path.join(repoRoot, relativePath), {
    encoding: 'utf8',
  });

const extractRequiredValue = (content, pattern, label) => {
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`Missing expected setting: ${label}`);
  }

  return match[1].trim();
};

describe('Production storage defaults synchronization guard', () => {
  it('keeps S3 bucket defaults aligned with shared storage constants', () => {
    const envExampleContent = readRepoTextFile('.env.prod.example');
    const composeProdContent = readRepoTextFile('docker-compose.prod.yml');

    const envDefaultBucket = extractRequiredValue(
      envExampleContent,
      /^S3_BUCKET=([^\r\n#]+)/m,
      '.env.prod.example S3_BUCKET',
    );
    const composeDefaultBucket = extractRequiredValue(
      composeProdContent,
      /^\s*S3_BUCKET:\s*\$\{S3_BUCKET:-([^}]+)\}/m,
      'docker-compose.prod.yml S3_BUCKET fallback',
    );

    expect(envDefaultBucket).toBe(STORAGE_BUCKETS.PRIMARY_UPLOADS);
    expect(composeDefaultBucket).toBe(STORAGE_BUCKETS.PRIMARY_UPLOADS);
  });

  it('keeps production override-guard defaults fail-closed in both files', () => {
    const envExampleContent = readRepoTextFile('.env.prod.example');
    const composeProdContent = readRepoTextFile('docker-compose.prod.yml');

    const envOverrideDefault = extractRequiredValue(
      envExampleContent,
      /^ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE=([^\r\n#]+)/m,
      '.env.prod.example ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE',
    );
    const composeOverrideDefault = extractRequiredValue(
      composeProdContent,
      /^\s*ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE:\s*\$\{ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE:-([^}]+)\}/m,
      'docker-compose.prod.yml ALLOW_PRODUCTION_S3_BUCKET_OVERRIDE fallback',
    );

    expect(envOverrideDefault).toBe('false');
    expect(composeOverrideDefault).toBe('false');
  });
});
