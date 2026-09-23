#!/usr/bin/env node
/**
 * scripts/convert-legacy-docx.js
 *
 * Batch migration CLI script to enqueue background PDF conversion
 * for all historical DOCX capstone submissions.
 *
 * Usage:
 *   node scripts/convert-legacy-docx.js [--dry-run] [--limit=100]
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { enqueueDocxConversionJob, closeQueues } from '../server/jobs/queue.js';
import '../server/modules/submissions/submission.model.js';

const isDryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

async function run() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms_v2';
  console.log(`[Batch Convert] Connecting to MongoDB: ${mongoUri.replace(/:[^:]*@/, ':****@')}`);
  await mongoose.connect(mongoUri);

  const Submission = mongoose.model('Submission');

  const query = {
    $or: [
      { fileName: { $regex: /\.docx?$/i } },
      { fileType: { $regex: /wordprocessingml|msword/i } },
    ],
    convertedPdfKey: null,
    storageKey: { $exists: true, $ne: null },
    deletedAt: null,
  };

  let queryBuilder = Submission.find(query).select('_id fileName storageKey conversionStatus');
  if (limit > 0) {
    queryBuilder = queryBuilder.limit(limit);
  }

  const legacySubmissions = await queryBuilder.lean();
  console.log(
    `[Batch Convert] Found ${legacySubmissions.length} historical DOCX submissions needing conversion.`,
  );

  if (legacySubmissions.length === 0) {
    console.log('[Batch Convert] All DOCX submissions are already converted or up to date.');
    await mongoose.disconnect();
    await closeQueues();
    process.exit(0);
  }

  if (isDryRun) {
    console.log('[Batch Convert] Dry-run mode active. Submissions that would be queued:');
    legacySubmissions.forEach((sub, i) => {
      console.log(`  ${i + 1}. [${sub._id}] ${sub.fileName} (${sub.storageKey})`);
    });
    await mongoose.disconnect();
    await closeQueues();
    process.exit(0);
  }

  console.log('[Batch Convert] Enqueuing conversion jobs into BullMQ...');
  let queuedCount = 0;
  for (const sub of legacySubmissions) {
    try {
      const jobId = await enqueueDocxConversionJob({
        submissionId: sub._id.toString(),
        storageKey: sub.storageKey,
        fileName: sub.fileName,
      });

      if (jobId) {
        await Submission.findByIdAndUpdate(sub._id, {
          $set: { conversionStatus: 'PENDING' },
        });
        queuedCount += 1;
      }
    } catch (err) {
      console.error(`[Batch Convert] Failed to enqueue submission ${sub._id}:`, err.message);
    }
  }

  console.log(
    `[Batch Convert] Successfully queued ${queuedCount}/${legacySubmissions.length} conversion jobs.`,
  );
  await mongoose.disconnect();
  await closeQueues();
  process.exit(0);
}

run().catch((err) => {
  console.error('[Batch Convert] Fatal error:', err);
  process.exit(1);
});
