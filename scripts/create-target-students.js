import crypto from 'crypto';

const API_BASE = process.env.API_BASE || 'http://localhost:43210/api';

const STUDENTS_TO_CREATE = [
  { firstName: 'Kyle', lastName: 'Cabrales' },
  { firstName: 'Jason', lastName: 'Mendoza' },
  { firstName: 'Stephanie', lastName: 'Fuentes' },
  { firstName: 'Ken', lastName: 'Versoza' },
];

const DEFAULT_PASSWORD = 'Password123!';

function generateRandomStudentId(existingIds) {
  while (true) {
    // Generate a 4-digit suffix between 1000 and 9999
    const suffix = crypto.randomInt(1000, 10000);
    const id = `240110${suffix}`;
    if (!existingIds.has(id)) {
      existingIds.add(id);
      return id;
    }
  }
}

async function main() {
  console.log('================================================================');
  console.log(' BukSU CMS-V2 — Student Account Creation via Official API');
  console.log('================================================================\n');

  // Step 1: Authenticate as Instructor
  console.log('[1/4] Authenticating as Instructor (instructor@buksu.edu.ph)...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'instructor@buksu.edu.ph',
      password: DEFAULT_PASSWORD,
    }),
  });

  if (!loginRes.ok) {
    const err = await loginRes.json();
    throw new Error(`Instructor authentication failed: ${err.message || loginRes.statusText}`);
  }

  const instructorCookies = loginRes.headers.get('set-cookie');
  console.log('      Instructor authenticated successfully.\n');

  // Step 2: Fetch existing users to ensure unique Student IDs
  console.log('[2/4] Querying existing users for student ID uniqueness...');
  const usersRes = await fetch(`${API_BASE}/users?limit=200`, {
    headers: { Cookie: instructorCookies },
  });
  const usersData = await usersRes.json();
  const existingEmails = new Set((usersData.data?.users || []).map((u) => u.email.toLowerCase()));
  const existingIds = new Set(
    Array.from(existingEmails)
      .map((e) => e.split('@')[0])
      .filter((prefix) => /^\d{10}$/.test(prefix)),
  );
  console.log(
    `      Found ${existingEmails.size} existing users (${existingIds.size} student IDs registered).\n`,
  );

  // Step 3: Create each student account via POST /api/users
  console.log('[3/4] Creating 4 new student accounts...');
  const createdStudents = [];

  for (const student of STUDENTS_TO_CREATE) {
    const studentId = generateRandomStudentId(existingIds);
    const email = `${studentId}@student.buksu.edu.ph`;

    const payload = {
      firstName: student.firstName,
      middleName: '',
      lastName: student.lastName,
      email,
      password: DEFAULT_PASSWORD,
      role: 'student',
    };

    const createRes = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: instructorCookies,
      },
      body: JSON.stringify(payload),
    });

    const createData = await createRes.json();

    if (!createRes.ok || !createData.success) {
      throw new Error(
        `Failed to create student ${student.firstName} ${student.lastName}: ${createData.message || createRes.statusText}`,
      );
    }

    const createdUser = createData.data?.user || createData.data;
    createdStudents.push({
      id: createdUser._id,
      studentId,
      fullName: `${student.firstName} ${student.lastName}`,
      email,
      password: DEFAULT_PASSWORD,
      role: createdUser.role,
      isVerified: createdUser.isVerified,
    });

    console.log(
      `      [CREATED] ${student.firstName} ${student.lastName} -> ${email} (ID: ${createdUser._id})`,
    );
  }

  // Step 4: Verification — Login test for each newly created student
  console.log('\n[4/4] Verifying authentication credentials for all 4 students...');
  for (const student of createdStudents) {
    const studentLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: student.email,
        password: student.password,
      }),
    });

    const loginData = await studentLoginRes.json();
    if (!studentLoginRes.ok || !loginData.success) {
      throw new Error(`Login verification failed for ${student.email}: ${loginData.message}`);
    }
    console.log(
      `      [VERIFIED] ${student.email} logged in successfully (Role: ${loginData.data?.user?.role}, Active: ${loginData.data?.user?.isActive})`,
    );
  }

  console.log('\n================================================================');
  console.log(' SUMMARY OF CREATED STUDENT ACCOUNTS');
  console.log('================================================================');
  console.table(
    createdStudents.map((s) => ({
      'Full Name': s.fullName,
      'Student ID': s.studentId,
      'Institutional Email': s.email,
      Role: s.role,
      Verified: s.isVerified,
      Password: s.password,
    })),
  );
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n[FATAL ERROR]', err.message);
  process.exitCode = 1;
});
