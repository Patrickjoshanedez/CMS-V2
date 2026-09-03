import { MongoMemoryServer } from 'mongodb-memory-server';

console.log('[MemoryMongo] Starting embedded in-memory MongoDB on port 27017...');

try {
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'cms_v2',
    },
  });

  console.log(`[MemoryMongo] ✅ In-memory MongoDB is ready at: ${mongod.getUri()}`);
  console.log('[MemoryMongo] 💡 You can now run "npm run dev" or seed data with "npm run seed".');
  console.log('[MemoryMongo] Press Ctrl+C to stop.');

  const shutdown = async () => {
    console.log('\n[MemoryMongo] Shutting down in-memory MongoDB...');
    await mongod.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  await new Promise(() => {});
} catch (error) {
  if (error.message && error.message.includes('EADDRINUSE')) {
    console.log('[MemoryMongo] Port 27017 is already in use by an active MongoDB instance.');
  } else {
    console.error('[MemoryMongo] Failed to start:', error.message);
  }
  process.exit(1);
}
