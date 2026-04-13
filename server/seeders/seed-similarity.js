#!/usr/bin/env node

/**
 * Seed database with similarity test projects
 * Usage: npm run seed:similarity
 */

import mongoose from 'mongoose';
import { seedSimilarityTestProjects, SIMILARITY_TEST_PROJECTS } from './similarity-test-data.js';
import env from '../config/env.js';

const DEFAULT_DEV_URI = 'mongodb://127.0.0.1:27017/cms_v2';

const resolveMongoUriForSeeder = () => {
  const fallbackUri = env.MONGODB_DEV_FALLBACK_URI || DEFAULT_DEV_URI;
  const primaryUri = env.MONGODB_URI || fallbackUri;

  return primaryUri;
};

const MONGODB_URI = resolveMongoUriForSeeder();

const isTransientMongoConnectionError = (error) => {
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  const errorCodes = [error?.code, error?.cause?.code]
    .filter((code) => typeof code === 'string')
    .map((code) => code.toUpperCase());

  if (errorCodes.some((code) => ['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN'].includes(code))) {
    return true;
  }

  return /econnrefused|enotfound|eai_again|etimedout|ehostunreach|network error/i.test(message);
};

const connectWithFallback = async () => {
  const fallbackUri = env.MONGODB_DEV_FALLBACK_URI || DEFAULT_DEV_URI;
  const candidates = [MONGODB_URI, fallbackUri].filter(
    (uri, index, list) => uri && list.indexOf(uri) === index,
  );

  let lastError;
  for (const uri of candidates) {
    try {
      console.log(`Connecting to MongoDB: ${uri}`);
      await mongoose.connect(uri);
      return;
    } catch (error) {
      lastError = error;

      const shouldTryNext = isTransientMongoConnectionError(error);
      if (shouldTryNext) {
        console.warn(`Mongo connection failed for ${uri}: ${error.message}`);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

async function main() {
  try {
    await connectWithFallback();
    console.log('✓ Connected to MongoDB');

    console.log(`\nSeeding ${SIMILARITY_TEST_PROJECTS.length} similarity test projects...`);
    const insertedIds = await seedSimilarityTestProjects();

    console.log('\n✓ Seeding complete');
    console.log(`\nSeeded projects:`);
    SIMILARITY_TEST_PROJECTS.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.title} (${p.status})`);
    });

    console.log('\n📋 Test scenarios available:');
    console.log('  1. POST /api/projects/similarity-scan');
    console.log('     - Try scanning with "Capstone Management and Plagiarism Checker"');
    console.log('     - Should find exact and partial matches');
    console.log('  2. Try partial title matches');
    console.log('  3. Try complete topic mismatches');
    console.log('  4. Try multi-field overlaps');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
