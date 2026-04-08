import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

import Project from './server/modules/projects/project.model.js';
import Submission from './server/modules/submissions/submission.model.js';

const MONGODB_URI = process.env.MONGODB_URI;

async function verifyArchive() {
  console.log('\n📦 ARCHIVED PROJECTS VERIFICATION');
  console.log('═'.repeat(70));

  await mongoose.connect(MONGODB_URI, { autoIndex: true });
  console.log(
    `✅ Connected to MongoDB at ${mongoose.connection.host}/${mongoose.connection.name}\n`,
  );

  // ─ Count archived projects
  const archivedProjects = await Project.find(
    { isArchived: true, capstonePhase: 4 },
    { title: 1, abstract: 1, keywords: 1, archivedAt: 1, projectStatus: 1, academicYear: 1 },
  );

  console.log(`📊 Total archived projects found: ${archivedProjects.length}\n`);

  // ─ Display each archived project
  for (let i = 0; i < archivedProjects.length; i++) {
    const proj = archivedProjects[i];
    console.log(`${i + 1}. ${proj.title}`);
    console.log(`   Abstract: ${proj.abstract.substring(0, 70)}...`);
    console.log(`   Keywords: ${proj.keywords.join(', ')}`);
    console.log(`   Academic Year: ${proj.academicYear}`);
    console.log(`   Project Status: ${proj.projectStatus}`);
    console.log(`   Archived At: ${proj.archivedAt}`);
    console.log('');
  }

  // ─ Count submissions per type
  console.log('📋 SUBMISSIONS VERIFICATION');
  console.log('─'.repeat(70));

  const allSubmissions = await Submission.aggregate([
    { $match: { projectId: { $in: archivedProjects.map((p) => p._id) } } },
    { $group: { _id: '$submissionType', count: { $sum: 1 } } },
  ]);

  console.log('Submissions by type:');
  for (const sub of allSubmissions) {
    console.log(`  • ${sub._id}: ${sub.count}`);
  }

  // ─ Verify final_academic and final_journal submisisons exist
  console.log('\n📄 SUBMISSION RECORDS DETAIL');
  console.log('─'.repeat(70));

  for (const proj of archivedProjects) {
    const subs = await Submission.find({ projectId: proj._id }, { submissionType: 1 });
    const types = subs.map((s) => s.submissionType).join(', ');
    console.log(`${proj.title.substring(0, 50)}: ${types}`);
  }

  console.log('\n✅ Verification complete!\n');
  await mongoose.disconnect();
}

verifyArchive().catch((err) => {
  console.error('❌ Verification failed:', err.message);
  mongoose.disconnect();
  process.exit(1);
});
