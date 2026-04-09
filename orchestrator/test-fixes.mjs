/**
 * Quick test to verify the two fixes:
 * 1. compressToolOutput returns object for 'test' type
 * 2. routeToTier creates session files
 */

import { compressToolOutput } from './token-optimizer.js';
import { routeToTier, retrieveFromTier, TIERS } from './memory-tiers.js';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

console.log('=== Test 1: compressToolOutput for test type ===');

const testOutput = `
Running tests...
45 tests passed
2 tests failed
1 test skipped

FAILED: test_auth.spec.js
FAILED: test_api.spec.js

Error: Expected true to equal false
`;

const compressed = compressToolOutput(testOutput, 'test');
console.log('Type:', typeof compressed);
console.log('Is Object:', compressed !== null && typeof compressed === 'object');
console.log('Has passed:', typeof compressed.passed === 'number');
console.log('Has failed:', typeof compressed.failed === 'number');
console.log('Has skipped:', typeof compressed.skipped === 'number');
console.log('Passed value:', compressed.passed);
console.log('Failed value:', compressed.failed);
console.log('Skipped value:', compressed.skipped);
console.log('Summary:', compressed.summary?.substring(0, 80) + '...');

const test1Pass = typeof compressed === 'object' && 
                  typeof compressed.passed === 'number' &&
                  typeof compressed.failed === 'number';
console.log('TEST 1:', test1Pass ? 'PASSED' : 'FAILED');

console.log('\n=== Test 2: routeToTier for session tier ===');

// Clean up any existing test file first
const sessionPath = TIERS.session.path;
const testFilePath = join(sessionPath, 'session_data.json');
try { unlinkSync(testFilePath); } catch(e) { /* ignore */ }

const result = routeToTier('session_data', { test: 'value', nested: { a: 1 } }, 'session');
console.log('Route success:', result.success);
console.log('Route tier:', result.tier);
console.log('Route filePath:', result.filePath);
console.log('File exists after route:', existsSync(testFilePath));

// Retrieve it back
const retrieved = retrieveFromTier('session_data', 'session');
console.log('Retrieved:', retrieved !== null);
console.log('Retrieved value:', JSON.stringify(retrieved?.value));

const test2Pass = result.success && existsSync(testFilePath) && retrieved !== null;
console.log('TEST 2:', test2Pass ? 'PASSED' : 'FAILED');

// Cleanup
try { unlinkSync(testFilePath); } catch(e) { /* ignore */ }

console.log('\n=== Summary ===');
console.log('Test 1 (compressToolOutput object structure):', test1Pass ? 'PASSED' : 'FAILED');
console.log('Test 2 (routeToTier creates files):', test2Pass ? 'PASSED' : 'FAILED');
console.log('Overall:', (test1Pass && test2Pass) ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');

process.exit(test1Pass && test2Pass ? 0 : 1);
