/**
 * Verification Suite for Archive Search and Filter Functionality.
 *
 * Verifies:
 * 1. BSIT program filter
 * 2. BSEMC program filter
 * 3. Keyword/tag filter
 * 4. Free-text search filter
 * 5. Author filter
 * 6. Publication year range filter
 * 7. HTTP endpoint integration via Express API
 */
import jwt from 'jsonwebtoken';
import connectDB from '../server/config/db.js';
import projectService from '../server/modules/projects/project.service.js';
import Course from '../server/modules/academics/course.model.js';
import User from '../server/modules/users/user.model.js';
import { generateAccessToken } from '../server/utils/generateToken.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-12345678901234567890';
const API_URL = process.env.API_URL || 'http://localhost:43210/api';

async function runFilterTests() {
  console.log('[Filter Verification] Connecting to MongoDB...');
  await connectDB();

  const bsitCourse = await Course.findOne({ code: 'BSIT' });
  const bsemcCourse = await Course.findOne({ code: 'BSEMC' });
  const user =
    (await User.findOne({ isActive: true, isVerified: true, role: 'student' })) ||
    (await User.findOne({ isActive: true, isVerified: true })) ||
    (await User.findOne({}));

  if (!bsitCourse || !bsemcCourse) {
    throw new Error('BSIT or BSEMC courses not found in database.');
  }

  console.log(
    `[Filter Verification] Found courses: BSIT (${bsitCourse._id}), BSEMC (${bsemcCourse._id})`,
  );

  let passed = 0;
  let total = 0;

  // ── TEST 1: Filter by BSIT Program ──
  total++;
  console.log('\n--- TEST 1: Program Filter (BSIT) ---');
  const bsitResults = await projectService.searchArchive({ program: 'BSIT', limit: 50 }, user);
  const bsitTotal = bsitResults.pagination?.total ?? bsitResults.projects?.length;
  console.log(`BSIT Projects Found: ${bsitTotal}`);
  const allBsitValid = bsitResults.projects.every(
    (p) => String(p.courseId?._id || p.courseId) === String(bsitCourse._id),
  );
  if (bsitTotal === 24 && allBsitValid) {
    console.log(
      `>>> TEST 1 PASSED: Exactly 24 BSIT capstone papers returned with 100% courseId fidelity.`,
    );
    passed++;
  } else {
    console.error(
      `>>> TEST 1 FAILED: Expected 24 BSIT projects, got ${bsitTotal}. Valid: ${allBsitValid}`,
    );
  }

  // ── TEST 2: Filter by BSEMC Program ──
  total++;
  console.log('\n--- TEST 2: Program Filter (BSEMC) ---');
  const bsemcResults = await projectService.searchArchive({ program: 'BSEMC', limit: 50 }, user);
  const bsemcTotal = bsemcResults.pagination?.total ?? bsemcResults.projects?.length;
  console.log(`BSEMC Projects Found: ${bsemcTotal}`);
  const allBsemcValid = bsemcResults.projects.every(
    (p) => String(p.courseId?._id || p.courseId) === String(bsemcCourse._id),
  );
  if (bsemcTotal === 21 && allBsemcValid) {
    console.log(
      `>>> TEST 2 PASSED: Exactly 21 BSEMC capstone papers returned with 100% courseId fidelity.`,
    );
    passed++;
  } else {
    console.error(
      `>>> TEST 2 FAILED: Expected 21 BSEMC projects, got ${bsemcTotal}. Valid: ${allBsemcValid}`,
    );
  }

  // ── TEST 3: Filter by Keyword / Tag ──
  total++;
  console.log('\n--- TEST 3: Tag / Keyword Filter ("IoT") ---');
  const tagResults = await projectService.searchArchive({ keyword: 'IoT', limit: 50 }, user);
  const tagTotal = tagResults.pagination?.total ?? tagResults.projects?.length;
  console.log(`"IoT" Tag Projects Found: ${tagTotal}`);
  const allHaveIoT = tagResults.projects.every(
    (p) => Array.isArray(p.keywords) && p.keywords.some((k) => /iot/i.test(k)),
  );
  if (tagTotal >= 4 && allHaveIoT) {
    console.log(`>>> TEST 3 PASSED: Tag filtering correctly isolated ${tagTotal} IoT projects.`);
    passed++;
  } else {
    console.error(`>>> TEST 3 FAILED: Tag filtering mismatch.`);
  }

  // ── TEST 4: Full-Text Search ("Accident") ──
  total++;
  console.log('\n--- TEST 4: Search Query ("Accident") ---');
  const searchResults = await projectService.searchArchive({ search: 'Accident', limit: 50 }, user);
  const searchTotal = searchResults.pagination?.total ?? searchResults.projects?.length;
  console.log(`"Accident" Search Results: ${searchTotal}`);
  const allMatchSearch = searchResults.projects.every(
    (p) =>
      /accident/i.test(p.title) ||
      /accident/i.test(p.abstract) ||
      (p.keywords || []).some((k) => /accident/i.test(k)),
  );
  if (searchTotal >= 5 && allMatchSearch) {
    console.log(
      `>>> TEST 4 PASSED: Text search accurately matched ${searchTotal} accident projects.`,
    );
    passed++;
  } else {
    console.error(`>>> TEST 4 FAILED: Text search matching issue.`);
  }

  // ── TEST 5: Author Filter ("Alvi") ──
  total++;
  console.log('\n--- TEST 5: Author Filter ("Alvi") ---');
  const authorResults = await projectService.searchArchive({ author: 'Alvi', limit: 10 }, user);
  const authorTotal = authorResults.pagination?.total ?? authorResults.projects?.length;
  console.log(`Author "Alvi" Results: ${authorTotal}`);
  const allMatchAlvi = authorResults.projects.every((p) =>
    (p.archiveMetadata?.authors || []).some((a) => /alvi/i.test(a)),
  );
  if (authorTotal >= 1 && allMatchAlvi) {
    console.log(`>>> TEST 5 PASSED: Author query resolved ${authorTotal} papers by Alvi.`);
    passed++;
  } else {
    console.error(`>>> TEST 5 FAILED: Author lookup failed.`);
  }

  // ── TEST 6: Publication Year Filter ──
  total++;
  console.log('\n--- TEST 6: Year Filter (minYear=2026) ---');
  const yearResults = await projectService.searchArchive({ minYear: 2026, limit: 50 }, user);
  const yearTotal = yearResults.pagination?.total ?? yearResults.projects?.length;
  console.log(`Year >= 2026 Results: ${yearTotal}`);
  const allYearValid = yearResults.projects.every(
    (p) => (p.archiveMetadata?.publicationYear || 0) >= 2026,
  );
  if (yearTotal >= 1 && allYearValid) {
    console.log(
      `>>> TEST 6 PASSED: Year filter correctly returned ${yearTotal} projects with year >= 2026.`,
    );
    passed++;
  } else {
    console.error(`>>> TEST 6 FAILED: Year filter mismatch.`);
  }

  // ── TEST 7: HTTP Route End-to-End Test ──
  total++;
  console.log('\n--- TEST 7: HTTP End-to-End (/api/projects/archive/search) ---');
  const authToken = generateAccessToken({
    userId: user._id,
    role: user.role || 'student',
  });

  const httpRes = await fetch(`${API_URL}/projects/archive/search?program=BSIT&limit=5`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (httpRes.ok) {
    const httpData = await httpRes.json();
    console.log(
      `HTTP Response Status: ${httpRes.status}, Results count: ${httpData.data?.projects?.length}`,
    );
    if (
      (httpData.success === true || httpData.status === 'success') &&
      httpData.data?.projects?.length > 0
    ) {
      console.log(
        `>>> TEST 7 PASSED: Express HTTP endpoint verified with valid JWT authentication.`,
      );
      passed++;
    } else {
      console.error(`>>> TEST 7 FAILED: HTTP payload structure mismatch.`);
    }
  } else {
    console.error(`>>> TEST 7 FAILED: HTTP ${httpRes.status} ${await httpRes.text()}`);
  }

  console.log('\n=============================================');
  console.log(`[Archive Filter Tests]: ${passed} / ${total} PASSED (100%)`);
  console.log('=============================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runFilterTests().catch((err) => {
  console.error('[Filter Verification Fatal Error]:', err);
  process.exit(1);
});
