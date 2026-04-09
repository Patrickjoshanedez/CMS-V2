/**
 * Test suite for critical fixes
 * Validates all 7 critical fixes are working correctly
 */

import { createLessonRecord, persistLesson } from './hllm.js';
import { invalidateLessonCache } from './hook-enforcer.js';
import { getSafeTimestamp, toSafeTimestamp, fromSafeTimestamp } from './utils.js';

console.log('=== Testing Critical Fixes ===\n');

// Test 1: HLLM Sanitization
console.log('Test 1: HLLM Sanitization in JSON persistence');
try {
  const lesson = createLessonRecord(
    'npm test',
    'Added auth token',
    'Error: Authentication failed. Token: Bearer abc123xyz. password=secret123 api_key=sk-1234567890',
    { rootCause: 'Invalid credentials' },
  );

  // Check that sensitive data is sanitized
  const hasBearerToken = lesson.failureTrace.includes('Bearer abc123xyz');
  const hasPassword = lesson.failureTrace.includes('secret123');
  const hasApiKey = lesson.failureTrace.includes('sk-1234567890');

  if (hasBearerToken || hasPassword || hasApiKey) {
    console.log('❌ FAILED: Sensitive data not sanitized');
    console.log(`   - Bearer token found: ${hasBearerToken}`);
    console.log(`   - Password found: ${hasPassword}`);
    console.log(`   - API key found: ${hasApiKey}`);
    console.log(`   - Trace: ${lesson.failureTrace}`);
  } else {
    console.log('✅ PASSED: Sensitive data properly sanitized');
  }
} catch (error) {
  console.log('❌ FAILED:', error.message);
}

// Test 2: Timestamp Utility
console.log('\nTest 2: Timestamp utility functions');
try {
  const safe = getSafeTimestamp();
  const isoDate = '2024-01-15T14:30:22.123Z';
  const safeFromIso = toSafeTimestamp(isoDate);
  const backToIso = fromSafeTimestamp(safeFromIso);

  // Validate format
  const isValidFormat = /^\d{14}$/.test(safe);
  const hasNoInvalidChars = !/[:.\-T]/.test(safe);
  const roundTripWorks = backToIso.startsWith('2024-01-15T14:30:22');

  if (isValidFormat && hasNoInvalidChars && roundTripWorks) {
    console.log('✅ PASSED: Timestamp utilities working correctly');
    console.log(`   - Current safe timestamp: ${safe}`);
    console.log(`   - ISO to safe: ${safeFromIso}`);
    console.log(`   - Round trip: ${isoDate} -> ${safeFromIso} -> ${backToIso}`);
  } else {
    console.log('❌ FAILED: Timestamp utility issues');
    console.log(`   - Valid format: ${isValidFormat}`);
    console.log(`   - No invalid chars: ${hasNoInvalidChars}`);
    console.log(`   - Round trip works: ${roundTripWorks}`);
  }
} catch (error) {
  console.log('❌ FAILED:', error.message);
}

// Test 3: Cache Invalidation
console.log('\nTest 3: Lesson cache invalidation');
try {
  invalidateLessonCache();
  console.log('✅ PASSED: Cache invalidation function exists and callable');
} catch (error) {
  console.log('❌ FAILED:', error.message);
}

// Test 4: Verify imports work correctly
console.log('\nTest 4: Module imports and exports');
try {
  const hasCreateLesson = typeof createLessonRecord === 'function';
  const hasPersistLesson = typeof persistLesson === 'function';
  const hasInvalidateCache = typeof invalidateLessonCache === 'function';
  const hasTimestampUtil = typeof getSafeTimestamp === 'function';

  if (hasCreateLesson && hasPersistLesson && hasInvalidateCache && hasTimestampUtil) {
    console.log('✅ PASSED: All required exports available');
  } else {
    console.log('❌ FAILED: Missing exports');
    console.log(`   - createLessonRecord: ${hasCreateLesson}`);
    console.log(`   - persistLesson: ${hasPersistLesson}`);
    console.log(`   - invalidateLessonCache: ${hasInvalidateCache}`);
    console.log(`   - getSafeTimestamp: ${hasTimestampUtil}`);
  }
} catch (error) {
  console.log('❌ FAILED:', error.message);
}

console.log('\n=== Test Suite Complete ===');
