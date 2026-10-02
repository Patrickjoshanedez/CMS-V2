import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/cms_v2';

async function seedBsemc() {
  console.log('Connecting to MongoDB at:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const coursesCol = mongoose.connection.db.collection('courses');
  const existing = await coursesCol.findOne({ code: 'BSEMC' });

  if (existing) {
    console.log('BSEMC course already exists with ID:', existing._id);
  } else {
    // Find an admin user or existing creator
    const bsit = await coursesCol.findOne({ code: 'BSIT' });
    const createdBy = bsit?.createdBy || new mongoose.Types.ObjectId();

    const result = await coursesCol.insertOne({
      name: 'Bachelor of Science in Entertainment and Multimedia Computing',
      code: 'BSEMC',
      isActive: true,
      createdBy: createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0,
    });
    console.log('Inserted BSEMC course with ID:', result.insertedId);
  }

  const allCourses = await coursesCol.find({}).toArray();
  console.log('All available courses in database:');
  allCourses.forEach((c) => console.log(` - [${c.code}] ${c.name} (ID: ${c._id})`));

  await mongoose.disconnect();
}

seedBsemc().catch((err) => {
  console.error('Failed to seed BSEMC:', err);
  process.exit(1);
});
