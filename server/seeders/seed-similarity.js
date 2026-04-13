#!/usr/bin/env node

/**
 * Seed database with similarity test projects
 * Usage: npm run seed:similarity
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedSimilarityTestProjects, SIMILARITY_TEST_PROJECTS } from './similarity-test-data.js';

dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms_dev';

async function main() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
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
