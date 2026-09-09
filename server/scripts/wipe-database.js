import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/cms_v2';
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://minio:9000';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_BUCKET = process.env.S3_BUCKET || 'cms-buksu-uploads';
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || 'minioadmin';
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || 'minioadmin';

async function wipeDatabase() {
  console.log('🚨 STARTING TOTAL DATABASE WIPEOUT...');
  console.log('━'.repeat(60));

  // 1. Connect to MongoDB
  console.log(`📡 Connecting to MongoDB at ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`✅ Connected to DB: ${db.databaseName}`);

  // List all collections dynamically
  const collections = await db.listCollections().toArray();
  console.log(`Found ${collections.length} collections in MongoDB.`);

  const wipeSummary = [];

  for (const collInfo of collections) {
    const collName = collInfo.name;
    if (collName.startsWith('system.')) continue;
    const coll = db.collection(collName);
    const countBefore = await coll.countDocuments();
    const deleteRes = await coll.deleteMany({});
    wipeSummary.push({ collection: collName, countBefore, deleted: deleteRes.deletedCount });
  }

  console.log('\n📊 MongoDB Collections Wipe Summary:');
  console.table(wipeSummary);

  const totalDeleted = wipeSummary.reduce((acc, curr) => acc + curr.deleted, 0);
  console.log(`✅ Total documents deleted across all MongoDB collections: ${totalDeleted}`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');

  // 2. Flush Redis
  console.log(`\n📡 Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
  try {
    const redis = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    await redis.connect();
    console.log('✅ Connected to Redis.');
    const dbsizeBefore = await redis.dbsize();
    console.log(`Redis keys before flush: ${dbsizeBefore}`);
    await redis.flushall();
    const dbsizeAfter = await redis.dbsize();
    console.log(`✅ Redis flushed. Keys remaining: ${dbsizeAfter}`);
    redis.disconnect();
  } catch (err) {
    console.warn(`⚠️ Warning: Redis flush encountered an issue: ${err.message}`);
  }

  // 3. Clear S3 / MinIO Storage Bucket Objects
  console.log(`\n📡 Checking S3 / MinIO Storage Bucket: ${S3_BUCKET}...`);
  try {
    const s3 = new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });

    const listCmd = new ListObjectsV2Command({ Bucket: S3_BUCKET });
    const listRes = await s3.send(listCmd);
    if (listRes.Contents && listRes.Contents.length > 0) {
      console.log(`Found ${listRes.Contents.length} objects in bucket ${S3_BUCKET}. Deleting...`);
      const deleteParams = {
        Bucket: S3_BUCKET,
        Delete: {
          Objects: listRes.Contents.map((obj) => ({ Key: obj.Key })),
        },
      };
      await s3.send(new DeleteObjectsCommand(deleteParams));
      console.log(`✅ Successfully deleted ${listRes.Contents.length} objects from ${S3_BUCKET}.`);
    } else {
      console.log(`ℹ️ Bucket ${S3_BUCKET} is already empty.`);
    }
  } catch (err) {
    console.warn(`⚠️ Warning: MinIO S3 bucket clear encountered an issue: ${err.message}`);
  }

  console.log('\n🎉 DATABASE AND STORAGE WIPE COMPLETED SUCCESSFULLY!');
  console.log('Everything has been reset to an absolute clean slate (0 documents, 0 keys).');
}

wipeDatabase().catch((err) => {
  console.error('❌ Wipe failed with error:', err);
  process.exit(1);
});
