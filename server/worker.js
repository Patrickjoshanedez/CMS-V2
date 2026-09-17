import 'dotenv/config';
import mongoose from 'mongoose';
import { Worker } from 'bullmq';
import { getRedisConnectionOpts } from './config/redis.js';
import { processPdfJob } from './jobs/pdfProcessor.js';

process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '16';

import './modules/submissions/submission.model.js';
import './modules/projects/project.model.js';
import './modules/users/user.model.js';

let pdfWorker = null;

async function bootstrap() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms';
  await mongoose.connect(mongoUri, { maxPoolSize: 10 });
  console.warn('[Worker] Connected to MongoDB.');

  const redisOpts = getRedisConnectionOpts();

  pdfWorker = new Worker('pdf-processing-queue', processPdfJob, {
    connection: redisOpts,
    concurrency: parseInt(process.env.WORKER_PDF_CONCURRENCY || '2', 10),
  });

  pdfWorker.on('completed', (job) => console.warn(`[Worker] Job ${job.id} complete.`));
  pdfWorker.on('failed', async (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed:`, err.message);
    if (job?.data?.submissionId) {
      await mongoose.model('Submission').findByIdAndUpdate(job.data.submissionId, {
        $set: { 'extractedMetadata.status': 'FAILED', 'extractedMetadata.error': err.message },
      });
    }
  });

  console.warn('[Worker] PDF Processing Worker initialized and listening.');
}

async function shutdown() {
  console.warn('[Worker] Shutting down worker...');
  if (pdfWorker) await pdfWorker.close();
  await mongoose.connection.close(false);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

bootstrap().catch((err) => {
  console.error('[Worker] Fatal bootstrap error:', err);
  process.exit(1);
});
