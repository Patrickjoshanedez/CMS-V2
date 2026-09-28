import 'dotenv/config';
import mongoose from 'mongoose';
import {
  startDocumentExtractionWorker,
  stopDocumentExtractionWorker,
} from './jobs/documentExtraction.job.js';
import { startDocxConversionWorker, stopDocxConversionWorker } from './jobs/docxConversion.job.js';

process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '16';

import './modules/submissions/submission.model.js';
import './modules/projects/project.model.js';
import './modules/users/user.model.js';

let extractionWorker = null;
let docxWorker = null;

async function bootstrap() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cms';
  await mongoose.connect(mongoUri, { maxPoolSize: 10 });
  console.warn('[Worker] Connected to MongoDB.');

  extractionWorker = startDocumentExtractionWorker();
  docxWorker = startDocxConversionWorker();

  console.warn('[Worker] Workers initialized and listening.');
}

async function shutdown() {
  console.warn('[Worker] Shutting down workers...');
  if (extractionWorker) await stopDocumentExtractionWorker();
  if (docxWorker) await stopDocxConversionWorker();
  await mongoose.connection.close(false);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

bootstrap().catch((err) => {
  console.error('[Worker] Fatal bootstrap error:', err);
  process.exit(1);
});
