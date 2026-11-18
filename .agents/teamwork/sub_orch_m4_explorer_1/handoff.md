# Handoff Report: Canonical Role Accounts & Seeder Investigation (Milestone 4)

**Agent**: `sub_orch_m4_explorer_1`  
**State Folder**: `c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m4_explorer_1`  
**Working Directory**: `c:\Users\patri\dev\CMS-V2`  
**Mission**: Investigate existing seeder files in `server/seeders/` (`seed-canonical-role-accounts.js` and `index.js`), User model schema and password hashing, idempotency mechanisms, and identify exact CST modifications needed to support the 11 dedicated canonical role accounts.

---

## 1. Observation

### 1.1 `server/seeders/seed-canonical-role-accounts.js`
- **Location**: `server/seeders/seed-canonical-role-accounts.js:14–82`
- **Accounts Currently Defined**:
  Only **6 accounts** are defined in `seededAccounts`:
  1. `instructor@student.buksu.edu.ph` (`role: 'instructor'`, `title: 'Instructor / Coordinator'`)
  2. `adviser@student.buksu.edu.ph` (`role: 'adviser'`, `facultyRole: 'adviser'`, `title: 'Faculty Adviser'`)
  3. `panelchair@student.buksu.edu.ph` (`role: 'panelist'`, `facultyRole: 'panelist'`, `title: 'Faculty Panel Chair'`)
  4. `student@student.buksu.edu.ph` (`role: 'student'`, `title: 'Student (Team Alpha Lead)'`, `targetTeam: 'Team Alpha'`)
  5. `student2@student.buksu.edu.ph` (`role: 'student'`, `title: 'Student (Team Beta Lead)'`, `targetTeam: 'Team Beta'`)
  6. `student3@student.buksu.edu.ph` (`role: 'student'`, `title: 'Student (Team Gamma Lead)'`, `targetTeam: 'Team Gamma'`)
- **Missing Milestone 4 Accounts**:
  - `student4@student.buksu.edu.ph` (absent)
  - `secretary@student.buksu.edu.ph` (absent)
  - `panelist2@student.buksu.edu.ph` (absent)
  - `panelist3@student.buksu.edu.ph` (absent)
  - `dean@student.buksu.edu.ph` (absent)
  - Additionally, `student2` and `student3` are assigned as leads for Team Beta and Team Gamma rather than being fellow members of Team Alpha.
- **Password Handling**:
  - Line 12: `const DEFAULT_PASSWORD = 'Password123!';`
  - Line 93: `const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);` (Note: `hashedPassword` is declared but **never used** in user creation or updating).
  - Lines 102–114:
    ```javascript
    const userPayload = {
      firstName: acc.firstName,
      middleName: acc.middleName || '',
      lastName: acc.lastName,
      email: acc.email,
      role: acc.role,
      facultyRole: acc.facultyRole || null,
      password: DEFAULT_PASSWORD, // <--- Plaintext passed!
      isActive: true,
      isVerified: true,
      authProvider: 'local',
      sectionId: acc.targetTeam === 'Team Beta' ? sectionB?._id || sectionA?._id : sectionA?._id,
    };
    ```
- **Upsert / Idempotency**:
  - Lines 100–128:
    ```javascript
    let user = await User.findOne({ email: acc.email });
    if (user) {
      user.set(userPayload);
      await user.save();
    } else {
      user = await User.create(userPayload);
    }
    ```
  - This is an idempotent find-or-create loop. Repeated executions update the existing accounts without duplicate-key errors.

### 1.2 `server/seeders/index.js`
- **Location**: `server/seeders/index.js:802–870`
- **Execution Mechanism**:
  - Lines 804–826: Clears 16 collections (`Evaluations`, `Submissions`, `Manuscripts`, `PlagiarismResults`, `Notifications`, `AuditLogs`, `TeamInvites`, `Projects`, `Teams`, `Users`, `OTPs`, `RefreshTokens`, `Sections`, `Courses`, `AcademicYears`, `Settings`) via `deleteMany({})`.
  - It is a destructive, full-teardown seeder.
- **Accounts Defined**:
  - Uses legacy / personalized email addresses:
    - Instructor: `2301103203@student.buksu.edu.ph` (Patrick Josh Añedez)
    - Adviser: `leon.mentor.buksu@gmail.com` (Leon Mentor)
    - Panelist: `2301105311@student.buksu.edu.ph` (Steven Joe Bautista)
    - Students: `bennettchristiangeofferdon15@gmail.com`, `2301106923@student.buksu.edu.ph`, `chris.student.buksu@gmail.com`, `korjyojp@gmail.com`, etc.
  - **None** of the 11 canonical `@student.buksu.edu.ph` accounts (`student@student.buksu.edu.ph`, `instructor@student.buksu.edu.ph`, etc.) are defined in `index.js`.
- **Password Handling**:
  - Line 47: `const DEFAULT_PASSWORD = 'Password123!';`
  - Line 856: `baseUser.password = DEFAULT_PASSWORD;`
  - Line 858: `const u = await User.create(baseUser);`

### 1.3 `server/modules/users/user.model.js`
- **Location**: `server/modules/users/user.model.js:226–233`
- **Mongoose Pre-Save Hook**:
  ```javascript
  // --- Pre-save hook: hash password via off-thread Piscina worker pool ---
  userSchema.pre('save', async function () {
    // Skip hashing for Google OAuth users (no password) or unmodified passwords
    if (!this.password || !this.isModified('password')) return;

    const rounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 10;
    this.password = await hashPassword(this.password, rounds);
  });
  ```
- **Confirmed Password Contract**:
  The Mongoose `User` model's `pre('save')` middleware automatically hashes the password when `this.isModified('password')` is true.
  Therefore:
  1. Plain-text `'Password123!'` must be supplied to `User.create()` or `user.save()`.
  2. Passing an already-hashed string (e.g., from `bcrypt.hash`) would result in double-hashing, corrupting the stored password hash and breaking authentication.
  3. `reseed-target-users.js:125–140` also confirms this contract:
     ```javascript
     // Assign plain-text password — the model's pre-save hook will hash it
     user.password = DEFAULT_PASSWORD;
     await user.save();
     ```

### 1.4 User Schema Attributes & Strictness
- **Valid Schema Fields in `server/modules/users/user.model.js`**:
  - `firstName` (String, required)
  - `middleName` (String, default: '')
  - `lastName` (String, required)
  - `email` (String, required, lowercase, unique)
  - `password` (String, minlength: 8, select: false)
  - `role` (String, enum: `['student', 'faculty', 'adviser', 'panelist', 'instructor']`)
  - `facultyRole` (String, enum: `['adviser', 'panelist', null]`, default: `null`)
  - `isVerified` (Boolean, default: `false`, seeds must set `true`)
  - `isActive` (Boolean, default: `true`)
  - `authProvider` (String, enum: `['local', 'google']`, default: `'local'`)
  - `studentId` (String, maxlength: 32, default: '')
  - `teamId` (ObjectId, ref: `'Team'`, default: `null`)
  - `sectionId` (ObjectId, ref: `'Section'`, default: `null`)
  - `instructorId` (ObjectId, ref: `'User'`, default: `null`)
  - `panelAssignments` (Array of `{ projectId: ObjectId, role: 'chair' | 'member' | 'secretary' }`)
- **Non-Existent Schema Fields**:
  - `department`: **DOES NOT EXIST** on the User model.
  - `college`: **DOES NOT EXIST** on the User model.
  - `facultyId`: **DOES NOT EXIST** on the User model (the MongoDB `_id` is used as the faculty identifier).
  - Note: Mongoose schemas have `strict: true` by default; any non-schema properties passed to `create()` or `save()` will be ignored and discarded.

### 1.5 Institutional Committee & Role Rules
- **References**: `AGENTS.md`, `GEMINI.md`, `shared/constants/roles.js`, `team.model.js`, `project.model.js`
  1. **Primary Role Consolidation**:
     - Visible primary account roles: `student`, `instructor`, `faculty` (`PRIMARY_ROLES`).
     - Adviser, Secretary, Panelist, and Chair are appointments under the `faculty` umbrella (`user.service.js:listUsers` expands `role: 'faculty'` to `{ $in: ['faculty', 'adviser', 'panelist'] }`).
  2. **Instructor Exclusion**:
     - Course instructors (`role: 'instructor'`) are strictly prohibited from serving as Adviser, Secretary, or Defense Panelists on capstone committees (`team.service.js:assignCommittee`).
  3. **Defense Committee Composition**:
     - Exactly 1 Adviser (`adviserId`), 1 Secretary (`secretaryId`), and 3 Panelists (`panelistIds`):
       - Panelist 1: Panel Chair (`role: 'chair'`)
       - Panelist 2: Panel Member (`role: 'member'`)
       - Panelist 3: Panel Member (`role: 'member'`)
     - Secretary is also represented in project panel assignments with `role: 'secretary'`.
  4. **Secretary ADM Compliance Gate**:
     - `project.admSignatures.secretary.endorsed === true` is required before Tier 1 (Adviser), Tier 2 (Panelists/Chair), and Tier 3 (Dean) digital signatures unlock.
  5. **College Dean**:
     - Role: `faculty` (with title: `Dean, College of Technologies`).
     - Matches institutional references in `defenseScheduleSchema.clientName: 'Dr. Sales G. Aribe Jr.'` and certificate generation templates.

---

## 2. Logic Chain

1. **Password Hashing Chain**:
   - `user.model.js:226–233` attaches an asynchronous `pre('save')` hook that calls `hashPassword(this.password, rounds)`.
   - `User.create(payload)` internally instantiates a `new User(payload)` and calls `user.save()`.
   - In `seed-canonical-role-accounts.js:109`, `password: DEFAULT_PASSWORD` passes the plaintext `'Password123!'`.
   - The pre-save hook intercepts this and stores the bcrypt hash.
   - Therefore, passing an already-hashed password would cause double-hashing. Plaintext must always be passed.

2. **Account Population Gap Chain**:
   - E2E Playwright test harnesses (`scripts/e2e-capstone-core-scenarios.js`, `scripts/qa-test-runner.js`, `scripts/test-all-roles-browser.mjs`) and Milestone 4 specifications (`PROJECT.md:68–78`, `SCOPE.md:27–41`) expect 11 dedicated canonical accounts:
     1. `student@student.buksu.edu.ph`
     2. `student2@student.buksu.edu.ph`
     3. `student3@student.buksu.edu.ph`
     4. `student4@student.buksu.edu.ph`
     5. `instructor@student.buksu.edu.ph`
     6. `adviser@student.buksu.edu.ph`
     7. `secretary@student.buksu.edu.ph`
     8. `panelchair@student.buksu.edu.ph`
     9. `panelist2@student.buksu.edu.ph`
     10. `panelist3@student.buksu.edu.ph`
     11. `dean@student.buksu.edu.ph`
   - Currently, `seed-canonical-role-accounts.js` defines only 6 accounts, missing accounts 4, 7, 9, 10, 11.
   - `index.js` defines 0 of these 11 accounts (using legacy personal emails instead).
   - Hence, expanding `seed-canonical-role-accounts.js` to seed all 11 accounts and updating `index.js` to include them as primary test personas is required.

3. **Team Alpha Structural Alignment Chain**:
   - BukSU capstone teams consist of 1–4 students (`team.model.js:STANDARD_CAPSTONE_ROLES`).
   - `Team Alpha` is the flagship locked capstone team with approved title and full committee.
   - Currently, `seed-canonical-role-accounts.js` assigns `student2` to Team Beta and `student3` to Team Gamma.
   - For realistic end-to-end multi-role scenarios (Milestones 4 and 5), all four students (`student`, `student2`, `student3`, `student4`) must belong to `Team Alpha`:
     - Leader / Analyst: `student@student.buksu.edu.ph`
     - Frontend / UI/UX: `student2@student.buksu.edu.ph`
     - Backend / DB: `student3@student.buksu.edu.ph`
     - QA / Documentor: `student4@student.buksu.edu.ph`
   - Its defense committee must strictly assign:
     - Adviser: `adviser@student.buksu.edu.ph`
     - Secretary: `secretary@student.buksu.edu.ph`
     - Panelist 1 (Chair): `panelchair@student.buksu.edu.ph`
     - Panelist 2: `panelist2@student.buksu.edu.ph`
     - Panelist 3: `panelist3@student.buksu.edu.ph`
   - Instructor `instructor@student.buksu.edu.ph` must NOT be in `adviserId`, `secretaryId`, or `panelistIds`.

---

## 3. Caveats

1. **Strict Seeder Isolation**:
   - `server/seeders/index.js` is destructive (`deleteMany({})`). Running `npm run seed` clears all database data.
   - In contrast, `server/seeders/seed-canonical-role-accounts.js` is non-destructive and idempotent. Running `npm run seed:canonical` will upsert the 11 accounts and bind Team Alpha without wiping existing database state.
2. **Piscina Worker Pool in Test Environments**:
   - `cryptoWorkerPool.js` uses Piscina threads with fallback to standard `bcrypt.hash` if threads are unsupported in containerized or restricted test environments. The Mongoose pre-save hook safely resolves either way.
3. **Dean Role Specification**:
   - The User schema enum is `ROLE_VALUES = ['student', 'faculty', 'adviser', 'panelist', 'instructor']`.
   - The Dean account must use `role: 'faculty'` (or `'instructor'`, but `'faculty'` is preferred under primary role consolidation) with title `Dean, College of Technologies`. There is no separate `dean` role in `ROLE_VALUES`.

---

## 4. Conclusion & CST Implementation Blueprints

### 4.1 Answer Summary to the 6 Investigation Questions

| # | Question | Finding |
|---|----------|---------|
| 1 | Accounts currently seeded | `seed-canonical-role-accounts.js` has 6 accounts (missing 5: `student4`, `secretary`, `panelist2`, `panelist3`, `dean`). `index.js` has legacy accounts with 0 canonical accounts. |
| 2 | Password hashing mechanism | Mongoose `User` `pre('save')` hook automatically hashes plaintext passwords. Seeders **must pass plaintext** `'Password123!'`. Direct bcrypt hashing before `create()` / `save()` causes fatal double-hashing. |
| 3 | Exact User attributes | Valid schema fields: `firstName`, `middleName`, `lastName`, `email`, `password`, `role`, `facultyRole`, `isVerified`, `isActive`, `authProvider`, `studentId`, `teamId`, `sectionId`, `instructorId`, `panelAssignments`. **No** `department`, `college`, or `facultyId` fields exist. |
| 4 | Configuration of 11 accounts | Specified in detail below: 4 students for Team Alpha, 1 coordinator instructor, 1 adviser, 1 secretary, 3 panelists (1 chair + 2 members), 1 college dean. |
| 5 | Idempotency / upsert mechanism | `seed-canonical-role-accounts.js` implements `User.findOne({ email })` find-or-create upsert + array containment checks. `index.js` implements collection wipe (`deleteMany({})`) + rebuild. |
| 6 | Exact CST modifications | Blueprint detailed in Sections 4.2 and 4.3 below. |

---

### 4.2 CST Modification Blueprint for `server/seeders/seed-canonical-role-accounts.js`

#### A. Expand `seededAccounts` Array (Replace lines 14–82)
```javascript
const seededAccounts = [
  {
    email: 'instructor@student.buksu.edu.ph',
    firstName: 'Patrick Josh',
    middleName: 'S.',
    lastName: 'Añedez',
    role: 'instructor',
    title: 'Instructor / Coordinator',
    capabilities: [
      'Defense Scheduling',
      'Classes Management',
      'Reports Generation',
      'Archive Management',
      'Rubrics Configuration',
      'User Management',
      'Activity Log Review',
    ],
  },
  {
    email: 'adviser@student.buksu.edu.ph',
    firstName: 'Leon',
    middleName: '',
    lastName: 'Mentor',
    role: 'faculty',
    facultyRole: 'adviser',
    title: 'Faculty Adviser',
    capabilities: ['Advisee Reviews', 'Consultations Log', 'Tier 1 ADM Digital Signature'],
  },
  {
    email: 'secretary@student.buksu.edu.ph',
    firstName: 'Mary',
    middleName: 'Ann',
    lastName: 'Secretary',
    role: 'faculty',
    facultyRole: 'panelist',
    title: 'Committee Secretary',
    capabilities: ['Defense Minutes Entry', 'ADM Compliance Endorsement Gate'],
  },
  {
    email: 'panelchair@student.buksu.edu.ph',
    firstName: 'Steven Joe',
    middleName: '',
    lastName: 'Bautista',
    role: 'faculty',
    facultyRole: 'panelist',
    title: 'Faculty Panel Chair',
    capabilities: ['Panel Reviews', 'Defense Hearing Scoring', 'Tier 2 ADM Digital Signature'],
  },
  {
    email: 'panelist2@student.buksu.edu.ph',
    firstName: 'Eduardo',
    middleName: 'M.',
    lastName: 'Panelist',
    role: 'faculty',
    facultyRole: 'panelist',
    title: 'Faculty Defense Panelist 2',
    capabilities: ['Defense Hearing Scoring', 'Tier 2 ADM Digital Signature'],
  },
  {
    email: 'panelist3@student.buksu.edu.ph',
    firstName: 'Grace',
    middleName: 'L.',
    lastName: 'Panelist',
    role: 'faculty',
    facultyRole: 'panelist',
    title: 'Faculty Defense Panelist 3',
    capabilities: ['Defense Hearing Scoring', 'Tier 2 ADM Digital Signature'],
  },
  {
    email: 'dean@student.buksu.edu.ph',
    firstName: 'Sales',
    middleName: 'G.',
    lastName: 'Aribe Jr.',
    role: 'faculty',
    facultyRole: null,
    title: 'Dean, College of Technologies',
    capabilities: ['Institutional Archival Clearance', 'Tier 3 ADM Digital Signature', 'Completion Certificate Seal'],
  },
  {
    email: 'student@student.buksu.edu.ph',
    firstName: 'Bennettchristiangeofferdon',
    middleName: '',
    lastName: 'Student',
    role: 'student',
    studentId: '2301100001',
    title: 'Student (Team Alpha Lead)',
    targetTeam: 'Team Alpha',
    teamRole: 'Project Lead & Systems Analyst',
    capabilities: ['Team Lead', 'Capstone 1 (Approved Title)', 'Chapter Submissions & Revisions'],
  },
  {
    email: 'student2@student.buksu.edu.ph',
    firstName: 'Throylan',
    middleName: '',
    lastName: 'Antipuesto',
    role: 'student',
    studentId: '2301100002',
    title: 'Student (Team Alpha Member 2)',
    targetTeam: 'Team Alpha',
    teamRole: 'Frontend & UI/UX Developer',
    capabilities: ['Team Member', 'Sprint Tasks', 'Peer Reviews'],
  },
  {
    email: 'student3@student.buksu.edu.ph',
    firstName: 'Chris',
    middleName: '',
    lastName: 'Student',
    role: 'student',
    studentId: '2301100003',
    title: 'Student (Team Alpha Member 3)',
    targetTeam: 'Team Alpha',
    teamRole: 'Backend & Database Developer',
    capabilities: ['Team Member', 'API Integrations', 'Database Schemas'],
  },
  {
    email: 'student4@student.buksu.edu.ph',
    firstName: 'Yojp',
    middleName: '',
    lastName: 'Korj',
    role: 'student',
    studentId: '2301100004',
    title: 'Student (Team Alpha Member 4)',
    targetTeam: 'Team Alpha',
    teamRole: 'QA & Technical Documentor',
    capabilities: ['Team Member', 'Documentation', 'Test Plans'],
  },
];
```

#### B. Update User Payload Mapping (Lines 102–114)
Include `studentId`:
```javascript
const userPayload = {
  firstName: acc.firstName,
  middleName: acc.middleName || '',
  lastName: acc.lastName,
  email: acc.email,
  role: acc.role,
  facultyRole: acc.facultyRole || null,
  studentId: acc.studentId || '',
  password: DEFAULT_PASSWORD,
  isActive: true,
  isVerified: true,
  authProvider: 'local',
  sectionId: sectionA?._id,
};
```

#### C. Update Team Alpha & Project Alpha Binding Logic (Lines 131–171)
```javascript
const teamAlpha = await Team.findOne({ name: 'Team Alpha' });
const student1 = createdMap.get('student@student.buksu.edu.ph');
const student2 = createdMap.get('student2@student.buksu.edu.ph');
const student3 = createdMap.get('student3@student.buksu.edu.ph');
const student4 = createdMap.get('student4@student.buksu.edu.ph');
const adviser = createdMap.get('adviser@student.buksu.edu.ph');
const secretary = createdMap.get('secretary@student.buksu.edu.ph');
const panelChair = createdMap.get('panelchair@student.buksu.edu.ph');
const panelist2 = createdMap.get('panelist2@student.buksu.edu.ph');
const panelist3 = createdMap.get('panelist3@student.buksu.edu.ph');

if (teamAlpha && student1 && student2 && student3 && student4) {
  const alphaMembers = [student1, student2, student3, student4];
  for (const m of alphaMembers) {
    m.teamId = teamAlpha._id;
    m.sectionId = sectionA?._id;
    if (adviser) m.instructorId = adviser._id;
    await m.save();
  }

  teamAlpha.leaderId = student1._id;
  teamAlpha.members = alphaMembers.map((m) => m._id);
  teamAlpha.memberRoles = [
    { userId: student1._id, role: 'Project Lead & Systems Analyst' },
    { userId: student2._id, role: 'Frontend & UI/UX Developer' },
    { userId: student3._id, role: 'Backend & Database Developer' },
    { userId: student4._id, role: 'QA & Technical Documentor' },
  ];
  teamAlpha.isLocked = true;
  if (adviser) teamAlpha.adviserId = adviser._id;
  if (secretary) teamAlpha.secretaryId = secretary._id;
  teamAlpha.panelistIds = [panelChair?._id, panelist2?._id, panelist3?._id].filter(Boolean);
  await teamAlpha.save();
  console.log('✅ Team Alpha fully bound with 4 members and complete faculty committee.');

  const projectAlpha = await Project.findOne({ teamId: teamAlpha._id });
  if (projectAlpha) {
    if (adviser) projectAlpha.adviserId = adviser._id;
    if (secretary) projectAlpha.secretaryId = secretary._id;
    projectAlpha.panelistIds = [panelChair?._id, panelist2?._id, panelist3?._id].filter(Boolean);
    projectAlpha.panelists = [
      ...(panelChair ? [{ userId: panelChair._id, role: 'chair' }] : []),
      ...(panelist2 ? [{ userId: panelist2._id, role: 'member' }] : []),
      ...(panelist3 ? [{ userId: panelist3._id, role: 'member' }] : []),
      ...(secretary ? [{ userId: secretary._id, role: 'secretary' }] : []),
    ];
    await projectAlpha.save();
    console.log('✅ Project Alpha adviser, secretary, and 3 panelists bound.');

    // Update faculty panel assignments
    const committeeFaculty = [
      { user: panelChair, role: 'chair' },
      { user: panelist2, role: 'member' },
      { user: panelist3, role: 'member' },
      { user: secretary, role: 'secretary' },
    ];
    for (const { user, role } of committeeFaculty) {
      if (!user) continue;
      const hasAssignment = (user.panelAssignments || []).some(
        (a) => a.projectId?.equals?.(projectAlpha._id) && a.role === role,
      );
      if (!hasAssignment) {
        user.panelAssignments = user.panelAssignments || [];
        user.panelAssignments.push({ projectId: projectAlpha._id, role });
        await user.save();
      }
    }
  }
}
```

---

### 4.3 CST Modification Blueprint for `server/seeders/index.js`

1. **Add Canonical Accounts to Top-Level Definition Arrays**:
   - In `instructors`: Add `{ firstName: 'Patrick Josh', middleName: 'S.', lastName: 'Añedez', email: 'instructor@student.buksu.edu.ph', role: 'instructor' }`.
   - In `advisers`: Add `{ firstName: 'Leon', middleName: '', lastName: 'Mentor', email: 'adviser@student.buksu.edu.ph', role: 'faculty', facultyRole: 'adviser' }`.
   - In `panelists`: Add:
     - `{ firstName: 'Steven Joe', middleName: '', lastName: 'Bautista', email: 'panelchair@student.buksu.edu.ph', role: 'faculty', facultyRole: 'panelist' }`
     - `{ firstName: 'Eduardo', middleName: 'M.', lastName: 'Panelist', email: 'panelist2@student.buksu.edu.ph', role: 'faculty', facultyRole: 'panelist' }`
     - `{ firstName: 'Grace', middleName: 'L.', lastName: 'Panelist', email: 'panelist3@student.buksu.edu.ph', role: 'faculty', facultyRole: 'panelist' }`
     - `{ firstName: 'Mary', middleName: 'Ann', lastName: 'Secretary', email: 'secretary@student.buksu.edu.ph', role: 'faculty', facultyRole: 'panelist' }`
   - Add new `deans` array:
     - `const deans = [{ firstName: 'Sales', middleName: 'G.', lastName: 'Aribe Jr.', email: 'dean@student.buksu.edu.ph', role: 'faculty', facultyRole: null }];`
     - Include `...deans` in `allUserDefs`.
   - In `currentStudents` (Team Alpha 0–3):
     - Replace emails with `student@student.buksu.edu.ph`, `student2@student.buksu.edu.ph`, `student3@student.buksu.edu.ph`, `student4@student.buksu.edu.ph`.
2. **Current Team Definitions Alignment**:
   - In `currentTeamDefs[0]` (Team Alpha):
     - Set `memberIndices: [0, 1, 2, 3]`
     - Set `panelistIndices: [0, 1, 2]` (chair, panelist2, panelist3)
     - Set `secretaryIndex: 3` (secretary)

---

## 5. Verification Method

To independently verify this investigation and validate subsequent implementations:

1. **Dry-Run Syntax & Type Check**:
   ```bash
   node --check server/seeders/seed-canonical-role-accounts.js
   node --check server/seeders/index.js
   ```

2. **Run Canonical Seeder against Local MongoDB**:
   ```bash
   npm run seed:canonical --workspace=server
   ```
   *Expected Outcome*: Console displays all 11 accounts created/updated, Team Alpha bound with 4 members, and Project Alpha populated with adviser, secretary, and 3 panelists.

3. **Verify Seed Account Authentication & Hash Invariant**:
   Execute a targeted Node scratchpad test to verify that `comparePassword('Password123!')` returns `true` for all 11 seeded accounts:
   ```bash
   node -e "
     import('mongoose').then(async (m) => {
       await m.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cms_v2');
       const User = (await import('./server/modules/users/user.model.js')).default;
       const emails = [
         'student@student.buksu.edu.ph', 'student2@student.buksu.edu.ph', 'student3@student.buksu.edu.ph', 'student4@student.buksu.edu.ph',
         'instructor@student.buksu.edu.ph', 'adviser@student.buksu.edu.ph', 'secretary@student.buksu.edu.ph',
         'panelchair@student.buksu.edu.ph', 'panelist2@student.buksu.edu.ph', 'panelist3@student.buksu.edu.ph',
         'dean@student.buksu.edu.ph'
       ];
       for (const email of emails) {
         const u = await User.findOne({ email }).select('+password');
         if (!u) { console.error('MISSING:', email); continue; }
         const ok = await u.comparePassword('Password123!');
         console.log(email, ok ? '✅ AUTH OK' : '❌ HASH CORRUPT');
       }
       await m.disconnect();
     });
   "
   ```

4. **Run Unit / Integration Test Suites**:
   ```bash
   # Targeted project assign-panelist test:
   npm test --workspace=server -- tests/unit/project.assign-panelist.test.js

   # Targeted institutional workflow test:
   npm test --workspace=server -- tests/unit/institutionalWorkflow.reliability.test.js
   ```

5. **Invalidation Conditions**:
   - If `u.comparePassword('Password123!')` returns `false`, an already-hashed password was passed to `create()` or `save()`.
   - If `team.adviserId` or `team.panelistIds` contains the ID of `instructor@student.buksu.edu.ph`, the instructor exclusion invariant has been violated.
   - If `teamAlpha.members.length !== 4`, team roster scaffolding is incomplete.
