/** Disposable upload-acceptance environment. Never run against a development/live database. */
import fs from 'node:fs/promises';
import path from 'node:path';

const startupWatchdog = setTimeout(() => {
  console.error('Watchdog 110s startup timeout');
  process.exit(1);
}, 110000);

const expectedMongo = 'mongodb://cms-review-upload-mongo:27017/cms_review_upload_20261015';
if (
  process.env.ISOLATED_UPLOAD_BENCHMARK !== 'true' ||
  process.env.MONGODB_URI !== expectedMongo ||
  process.env.REDIS_HOST !== 'cms-review-upload-redis' ||
  process.env.S3_ENDPOINT !== 'http://cms-review-upload-minio:9000' ||
  process.env.S3_BUCKET !== 'cms-review-upload' ||
  process.env.NODE_ENV !== 'development'
) {
  throw new Error('Refusing bootstrap: exact disposable benchmark infrastructure is required.');
}
// The real email service can only attempt loopback; no external mail transport is permitted.
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_PORT = '1';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.STORAGE_MODE = 's3';

let httpServer;
try {
  console.log('Isolated bootstrap: importing actual application services');
  const [mongooseModule, appModule, usersModule, academicsModule, teamsModule,
    projectsModule, redisModule, shared, aws] = await Promise.all([
    import('../../server/node_modules/mongoose/index.js').catch(() => import('mongoose')),
    import('../../server/app.js'),
    import('../../server/modules/users/user.service.js'),
    import('../../server/modules/academics/academic.service.js'),
    import('../../server/modules/teams/team.service.js'),
    import('../../server/modules/projects/project.service.js'),
    import('../../server/config/redis.js'),
    import('@cms/shared'),
    import('@aws-sdk/client-s3'),
  ]);
  const mongoose = mongooseModule.default;
  await mongoose.connect(expectedMongo, { serverSelectionTimeoutMS: 10000 });
  await redisModule.initRedis();
  if (!redisModule.isRedisAvailable()) throw new Error('Isolated Redis is unavailable');
  console.log('Isolated bootstrap: database and Redis connected');
  const s3 = new aws.S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION || 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  try {
    await s3.send(new aws.CreateBucketCommand({ Bucket: process.env.S3_BUCKET }));
  } catch (error) {
    if (!['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(error.name)) throw error;
  }
  const users = usersModule.default;
  const academics = academicsModule.default;
  const teams = teamsModule.default;
  const projects = projectsModule.default;
  const runId = Date.now().toString(36);
  const password = 'IsolatedUpload2026!';
  const createUser = async (label, role) => {
    const { user } = await users.createUser({
      firstName: 'Benchmark', lastName: label,
      email: `isolated-${runId}-${label.toLowerCase()}@buksu.edu.ph`,
      password, role,
    });
    return user;
  };
  const instructor = await createUser('Instructor', 'instructor');
  const leader = await createUser('Leader', 'student');
  const member = await createUser('Member', 'student');
  const committee = [];
  for (const label of ['Adviser', 'Secretary', 'Chair', 'PanelTwo', 'PanelThree']) {
    committee.push(await createUser(label, 'faculty'));
  }
  const { course } = await academics.createCourse(instructor._id, {
    name: 'Disposable Upload Benchmark', code: `BENCH-${runId}`,
  });
  const { section } = await academics.createSection(instructor._id, {
    courseId: course._id, name: 'BENCH', code: `BENCH-${runId}`,
    academicYear: '2026-2027',
  });
  for (const student of [leader, member]) {
    await users.updateUser(student._id, { sectionId: section._id, instructorId: instructor._id });
  }
  const { team } = await teams.createTeam(leader._id, {
    name: `Isolated Upload ${runId}`, academicYear: '2026-2027',
  });
  const invitation = await teams.inviteMember(team._id, leader._id, { email: member.email });
  const invite = invitation.invite;
  if (!invite?.token && !invite?.inviteCode) throw new Error('Invitation service did not return acceptance token');
  await teams.acceptInvite(invite.token || invite.inviteCode, member._id);
  await teams.lockTeam(team._id, leader._id);
  await teams.assignCommittee(team._id, instructor._id, {
    adviserId: committee[0]._id, secretaryId: committee[1]._id,
    panelistIds: committee.slice(2).map((user) => user._id),
  });
  console.log('Isolated bootstrap: roster locked and five faculty appointed');
  const title = `Disposable Manuscript Upload Benchmark ${runId}`;
  const sdg = shared.SDG_TAG_SUGGESTIONS[0];
  const capstoneTitles = Object.values(shared.CAPSTONE_TITLES);
  const { project } = await projects.createProject(leader._id, {
    title, academicYear: '2026-2027', sectionId: section._id,
    titleProposals: [{ title, description: 'Controlled upload-acceptance benchmark fixture.',
      capstoneType: ['Web Application'], sdgTags: [sdg] }],
    sdgTags: [sdg], keywords: ['benchmark'],
    memberRoleAssignments: [leader, member].map((user, index) => ({
      userId: user._id, professionalTitle: capstoneTitles[index],
    })),
  });
  await projects.scheduleDefense(project._id, {
    date: new Date(Date.now() + 86400000).toISOString(), time: '09:00',
    venue: 'Disposable Benchmark', defenseType: 'proposal', status: 'scheduled',
  }, instructor);
  await projects.approveTitle(project._id, instructor, { proposalId: 0 });
  const state = await projects.getProject(project._id, leader);
  if (state.project?.titleStatus !== 'approved') throw new Error('Fixture title approval readback failed');
  const evidenceDir = process.env.ISOLATED_EVIDENCE_DIR || '/app/scratch/review-upload';
  await fs.mkdir(evidenceDir, { recursive: true });
  const metadata = {
    createdAt: new Date().toISOString(), runId, projectId: String(project._id),
    teamId: String(team._id), email: leader.email, password,
    memberEmail: member.email, instructorEmail: instructor.email,
    titleStatus: state.project.titleStatus, capstonePhase: state.project.capstonePhase,
    port: 43212, queueWorkersStarted: false,
    scope: 'Real authenticated HTTP upload acceptance, durable isolated MongoDB/MinIO storage, Redis enqueue; workers are intentionally not started.',
  };
  await fs.writeFile(path.join(evidenceDir, 'bootstrap.json'), JSON.stringify(metadata, null, 2));
  httpServer = appModule.default.listen(43212, '0.0.0.0', () => {
    clearTimeout(startupWatchdog);
    console.log(`ISOLATED_UPLOAD_READY ${JSON.stringify(metadata)}`);
  });
  const stop = () => httpServer.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
} catch (error) {
  console.error('Isolated bootstrap failed', error);
  process.exit(1);
}
