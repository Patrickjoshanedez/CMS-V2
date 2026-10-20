import { writeFile } from 'node:fs/promises';

const watchdog = setTimeout(() => { console.error('Watchdog 110s startup timeout'); process.exit(124); }, 110000);
if (process.env.ISOLATED_UPLOAD_BENCHMARK !== 'true' ||
  process.env.MONGODB_URI !== 'mongodb://cms-review-upload-mongo:27017/cms_review_upload_20261015' ||
  process.env.S3_ENDPOINT !== 'http://cms-review-upload-minio:9000') {
  throw new Error('Refusing to start a second worker outside isolated infrastructure.');
}
try {
  const [mongooseModule, appModule, redis] = await Promise.all([
    import('../../server/node_modules/mongoose/index.js').catch(() => import('mongoose')),
    import('../../server/app.js'), import('../../server/config/redis.js'),
  ]);
  await mongooseModule.default.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await redis.initRedis();
  const server = appModule.default.listen(43213, '0.0.0.0', async () => {
    await writeFile('/app/scratch/review-upload/worker-ready.json', JSON.stringify({ port: 43213, pid: process.pid, backgroundWorkersStarted: false }));
    clearTimeout(watchdog);
  });
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
} catch (error) {
  console.error(error);
  process.exit(1);
}
