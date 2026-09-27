/**
 * Migration Script: Ensure Performance Indexes on Projects, Submissions, Comments, and Teams
 *
 * Adds/verifies:
 * - Submissions: { projectId: 1, createdAt: -1 }
 * - Comments: { submissionId: 1, pageNumber: 1 }
 * - Teams: { projectId: 1 }
 * - Projects: cleanup invalid indexes and ensure dashboard lookup indexes
 */

import mongoose from 'mongoose';
import env from '../../server/config/env.js';
import Submission from '../../server/modules/submissions/submission.model.js';
import Comment from '../../server/modules/submissions/comment.model.js';
import Team from '../../server/modules/teams/team.model.js';
import Project from '../../server/modules/projects/project.model.js';

async function runMigration() {
  console.log('[Migration] Connecting to MongoDB...');
  const uri = env.MONGODB_URI || 'mongodb://localhost:27017/cms_v2';
  await mongoose.connect(uri);

  console.log('[Migration] Ensuring indexes on Submissions...');
  await Submission.syncIndexes();

  console.log('[Migration] Ensuring indexes on Comments...');
  await Comment.syncIndexes();

  console.log('[Migration] Ensuring indexes on Teams...');
  await Team.syncIndexes();

  console.log('[Migration] Ensuring indexes on Projects...');
  await Project.syncIndexes();

  console.log('[Migration] All performance indexes successfully applied and synchronized.');
  await mongoose.disconnect();
}

if (process.argv[1] && process.argv[1].endsWith('add-perf-indexes.js')) {
  runMigration().catch((err) => {
    console.error('[Migration] Failed:', err);
    process.exit(1);
  });
}

export default runMigration;
