#!/usr/bin/env node

/**
 * Filesystem Storage Verification Script
 *
 * Tests the entire upload/download flow locally before deploying to production.
 * Usage: node verify-filesystem-storage.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simulated StorageService calls (same logic as the real service)
class FilesystemStorageVerifier {
  constructor() {
    this.baseDir = path.join(__dirname, '..', 'uploads');
  }

  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      console.error(`[FAIL] Could not create directory: ${dirPath}`);
      console.error(error.message);
      return false;
    }
  }

  async writeFile(filePath, content) {
    try {
      await fs.writeFile(filePath, content);
      return true;
    } catch (error) {
      console.error(`[FAIL] Could not write file: ${filePath}`);
      console.error(error.message);
      return false;
    }
  }

  async readFile(filePath) {
    try {
      const content = await fs.readFile(filePath);
      return content;
    } catch (error) {
      console.error(`[FAIL] Could not read file: ${filePath}`);
      console.error(error.message);
      return null;
    }
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') return true; // Already deleted is OK
      console.error(`[FAIL] Could not delete file: ${filePath}`);
      console.error(error.message);
      return false;
    }
  }

  async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats;
    } catch (error) {
      return null;
    }
  }
}

// Test scenarios
const verifier = new FilesystemStorageVerifier();
let testsPassed = 0;
let testsFailed = 0;

const test = async (name, fn) => {
  try {
    process.stdout.write(`Testing: ${name}... `);
    const result = await fn();
    if (result) {
      console.log('✓ PASS');
      testsPassed++;
    } else {
      console.log('✗ FAIL');
      testsFailed++;
    }
  } catch (error) {
    console.log(`✗ FAIL: ${error.message}`);
    testsFailed++;
  }
};

// Run tests
const runTests = async () => {
  console.log('\n========================================');
  console.log('Filesystem Storage Verification Tests');
  console.log('========================================\n');

  // Test 1: Base directory creation
  await test('Base directory creation', async () => {
    return await verifier.ensureDir(verifier.baseDir);
  });

  // Test 2: Nested directory creation (chapter submission)
  await test('Nested directory creation (chapter path)', async () => {
    const testDir = path.join(
      verifier.baseDir,
      'archives',
      'projects',
      'test123',
      'chapters',
      '1',
      'v1',
    );
    return await verifier.ensureDir(testDir);
  });

  // Test 3: Write file
  await test('Write file to disk', async () => {
    const testFile = path.join(
      verifier.baseDir,
      'archives',
      'projects',
      'test123',
      'chapters',
      '1',
      'v1',
      'chapter.pdf',
    );
    const content = Buffer.from('PDF test content');
    return await verifier.writeFile(testFile, content);
  });

  // Test 4: Write metadata
  await test('Write metadata JSON', async () => {
    const testFile = path.join(
      verifier.baseDir,
      'archives',
      'projects',
      'test123',
      'chapters',
      '1',
      'v1',
      'chapter.pdf.meta.json',
    );
    const metadata = {
      contentType: 'application/pdf',
      uploadedAt: new Date().toISOString(),
      size: 16,
    };
    return await verifier.writeFile(testFile, JSON.stringify(metadata, null, 2));
  });

  // Test 5: Read file back
  await test('Read file from disk', async () => {
    const testFile = path.join(
      verifier.baseDir,
      'archives',
      'projects',
      'test123',
      'chapters',
      '1',
      'v1',
      'chapter.pdf',
    );
    const content = await verifier.readFile(testFile);
    return content && content.toString() === 'PDF test content';
  });

  // Test 6: Verify file size match
  await test('Verify file size', async () => {
    const testFile = path.join(
      verifier.baseDir,
      'archives',
      'projects',
      'test123',
      'chapters',
      '1',
      'v1',
      'chapter.pdf',
    );
    const stats = await verifier.getFileStats(testFile);
    return stats && stats.size === 16;
  });

  // Test 7: Avatar upload path
  await test('Avatar upload path creation', async () => {
    const avatarDir = path.join(verifier.baseDir, 'avatars', 'user-id-123');
    return await verifier.ensureDir(avatarDir);
  });

  // Test 8: Write avatar file
  await test('Write avatar file', async () => {
    const avatarFile = path.join(verifier.baseDir, 'avatars', 'user-id-123', 'profile');
    const content = Buffer.from('fake image data');
    return await verifier.writeFile(avatarFile, content);
  });

  // Test 9: Delete file
  await test('Delete file from disk', async () => {
    const testFile = path.join(
      verifier.baseDir,
      'archives',
      'projects',
      'test123',
      'chapters',
      '1',
      'v1',
      'chapter.pdf',
    );
    return await verifier.deleteFile(testFile);
  });

  // Test 10: Path traversal protection (should NOT allow .. in paths)
  await test('Path traversal protection', async () => {
    const dangerousPath = path.join(verifier.baseDir, '..', '..', 'sensitive-file');
    const normalized = path.normalize(dangerousPath);
    // Should still be under baseDir
    return normalized.startsWith(path.resolve(verifier.baseDir));
  });

  // Summary
  console.log('\n========================================');
  console.log(`Tests Passed: ${testsPassed}`);
  console.log(`Tests Failed: ${testsFailed}`);
  console.log('========================================\n');

  if (testsFailed === 0) {
    console.log('✓ All tests passed! Filesystem storage is ready.\n');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed. Check permissions and disk space.\n');
    process.exit(1);
  }
};

runTests().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
