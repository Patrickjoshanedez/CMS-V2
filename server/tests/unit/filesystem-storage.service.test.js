import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import filesystemStorageService from '../../services/filesystem-storage.service.js';

const relativeKey = 'archives/projects/test123/chapters/1/v1/chapter.pdf';

let originalBaseDir;
let tempDir;

const toAbsolutePath = (baseDir, key) => path.join(baseDir, ...key.split('/'));

const createFixture = async (baseDir) => {
  const absolutePath = toAbsolutePath(baseDir, relativeKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, Buffer.from('chapter-content'));
  await fs.writeFile(`${absolutePath}.meta.json`, JSON.stringify({ ok: true }));
  return absolutePath;
};

describe('FilesystemStorageService key resolution', () => {
  beforeEach(async () => {
    originalBaseDir = filesystemStorageService.baseDir;
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cms-fs-storage-'));
    filesystemStorageService.baseDir = tempDir;
  });

  afterEach(async () => {
    filesystemStorageService.baseDir = originalBaseDir;
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('accepts legacy relative keys for signed URLs', async () => {
    await createFixture(tempDir);

    const url = await filesystemStorageService.getSignedUrl(relativeKey);

    expect(url).toBe(`/storage/${relativeKey}`);
  });

  it('accepts absolute keys for file download', async () => {
    const absolutePath = await createFixture(tempDir);

    const fileBuffer = await filesystemStorageService.downloadFile(absolutePath);

    expect(fileBuffer.toString()).toBe('chapter-content');
  });

  it('accepts /storage URL keys for file deletion', async () => {
    const absolutePath = await createFixture(tempDir);

    await filesystemStorageService.deleteFile(`/storage/${relativeKey}`);

    await expect(fs.access(absolutePath)).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(fs.access(`${absolutePath}.meta.json`)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects traversal attempts outside base storage directory', async () => {
    await expect(filesystemStorageService.getSignedUrl('../../etc/passwd')).rejects.toMatchObject({
      code: 'STORAGE_INVALID_KEY',
      statusCode: 400,
    });
  });
});
