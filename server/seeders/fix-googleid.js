/**
 * One-time fix: remove explicit googleId:null from all users and
 * ensure the sparse unique index is correct.
 */
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // 1. Remove googleId:null from existing docs so sparse index skips them
  const result = await db
    .collection('users')
    .updateMany({ googleId: null }, { $unset: { googleId: '' } });
  console.log(`Unset googleId:null from ${result.modifiedCount} user(s)`);

  // 2. Verify indexes
  const indexes = await db.collection('users').indexes();
  console.log('Current indexes:');
  indexes.forEach((i) =>
    console.log(
      ' ',
      i.name,
      JSON.stringify(i.key),
      i.sparse ? 'SPARSE' : '',
      i.unique ? 'UNIQUE' : '',
    ),
  );

  await mongoose.disconnect();
  console.log('Done');
}

fix().catch((err) => {
  console.error(err);
  process.exit(1);
});
