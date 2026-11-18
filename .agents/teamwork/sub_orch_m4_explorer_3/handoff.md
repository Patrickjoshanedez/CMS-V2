# Milestone 4 Investigation Report: Test Suites, Seeder Scripts & Verification Mechanisms

## 1. Observation

### 1.1 Seeder Scripts in `package.json` and `server/package.json`
- **Root `package.json`**:
  - Line 32: `"seed": "npm run seed --workspace=server"`
  - Line 33: `"seed:server": "npm run seed --workspace=server"`
  - Line 34: `"seed:canonical": "npm run seed:canonical --workspace=server"`
  - Line 35: `"seed:archive:pdfs": "npm run seed:archive:pdfs --workspace=server"`
  - Line 36: `"seed:orphans": "npm run seed:orphans --workspace=server"`
  - Test scripts:
    - Line 45: `"test:client": "npm test --workspace=client --"`
    - Line 46: `"test:server": "npm test --workspace=server --"`
    - Line 44: `"test:e2e": "node scripts/e2e-capstone-core-scenarios.js"`
- **`server/package.json`**:
  - Line 6: `"type": "module"` (ESM project)
  - Line 12: `"seed": "node seeders/index.js"`
  - Line 13: `"seed:similarity": "node seeders/seed-similarity.js"`
  - Line 14: `"seed:archive:pdfs": "node seeders/seed-archived-capstone-pdfs.js"`
  - Line 15: `"seed:orphans": "node seeders/seed-orphaned-users.js"`
  - Line 16: `"seed:users": "node seeders/seed-users-only.js"`
  - Line 17: `"seed:canonical": "node seeders/seed-canonical-role-accounts.js"`
  - Line 18: `"seed:reseed-targets": "docker exec cms-deploy-server node server/seeders/reseed-target-users.js"`
  - Line 19: `"test": "vitest run"`
  - Line 20: `"test:watch": "vitest"`

### 1.2 Existing Seeder Structure and Differences
- **`server/seeders/index.js` (Lines 802–826)**:
  - Destructive execution: Wipes all collections (`deleteMany({})`) across 16 models (`Evaluations`, `Submissions`, `Manuscripts`, `PlagiarismResults`, `Notifications`, `AuditLogs`, `TeamInvites`, `Projects`, `Teams`, `Users`, `OTPs`, `RefreshTokens`, `Sections`, `Courses`, `AcademicYears`, `Settings`).
  - Does NOT call `seed-canonical-role-accounts.js`.
  - Creates 1 instructor (`2301103203@student.buksu.edu.ph`), 1 adviser (`leon.mentor.buksu@gmail.com`), 1 panelist (`2301105311@student.buksu.edu.ph`), current students, scenario students, and 20 alumni students.
- **`server/seeders/seed-canonical-role-accounts.js` (Lines 14–82, 101–128, 213–216)**:
  - Standalone script with immediate IIFE/top-level call:
    ```javascript
    seedCanonicalAccounts().catch((err) => {
      console.error('❌ Seeding failed with error:', err);
      process.exit(1);
    });
    ```
  - Currently contains only 6 accounts:
    1. `instructor@student.buksu.edu.ph` (role: `'instructor'`)
    2. `adviser@student.buksu.edu.ph` (role: `'adviser'`, facultyRole: `'adviser'`)
    3. `panelchair@student.buksu.edu.ph` (role: `'panelist'`, facultyRole: `'panelist'`)
    4. `student@student.buksu.edu.ph` (role: `'student'`, Team Alpha Lead)
    5. `student2@student.buksu.edu.ph` (role: `'student'`, Team Beta Lead)
    6. `student3@student.buksu.edu.ph` (role: `'student'`, Team Gamma Lead)
  - Missing from current file: `student4@student.buksu.edu.ph`, `secretary@student.buksu.edu.ph`, `panelist2@student.buksu.edu.ph`, `panelist3@student.buksu.edu.ph`, and `dean@student.buksu.edu.ph`.
  - Non-destructive upsert behavior: checks `User.findOne({ email: acc.email })`; if found, sets properties and saves; if not found, creates.

### 1.3 Database Connectivity & Network Environment
- **`server/seeders/seed-canonical-role-accounts.js` (Lines 9–11)**:
  ```javascript
  import dotenv from 'dotenv';
  dotenv.config();
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongodb:27017/cms_v2';
  ```
  - In Docker (`cms-server`), `mongodb:27017` resolves to container `cms-mongodb`.
  - On the host machine (Windows terminal), `mongodb` hostname fails DNS resolution (`ENOTFOUND`).
  - Docker Compose port mapping in `docker-compose.yml:15`:
    ```yaml
    ports:
      - "${MONGODB_PORT:-27018}:27017"
    ```
    The host port is mapped to `27018` by default (or `27017` if standalone).
  - In contrast, `server/seeders/seed-users-only.js` (lines 32–34) uses:
    ```javascript
    const DEFAULT_DEV_URI = 'mongodb://127.0.0.1:27017/cms_v2';
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_DEV_FALLBACK_URI || DEFAULT_DEV_URI;
    ```

### 1.4 Password Hashing Mechanism & Double-Hashing Trap
- **`server/modules/users/user.model.js` (Lines 226–233)**:
  ```javascript
  // --- Pre-save hook: hash password via off-thread Piscina worker pool ---
  userSchema.pre('save', async function () {
    // Skip hashing for Google OAuth users (no password) or unmodified passwords
    if (!this.password || !this.isModified('password')) return;

    const rounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 10;
    this.password = await hashPassword(this.password, rounds);
  });
  ```
- **Crucial finding**: `User.create({ password })` and `user.save()` invoke this `pre('save')` hook.
- If seed data passes plaintext `'Password123!'`, Mongoose hashes it once.
- In `seed-canonical-role-accounts.js:93`, `const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);` was computed but unused; line 109 correctly passes `password: DEFAULT_PASSWORD`. If `hashedPassword` were passed, the `pre('save')` hook would hash the hash, causing double-hashing corruption that prevents login!

### 1.5 Test Suites & Seeder Verification
- **`server/vitest.config.js`**: Uses Vitest with forks pool, `tests/setup.js`.
- **`server/tests/setup.js`**: Launches `MongoMemoryServer` when `requiresMongoMemoryServer()` evaluates to true.
- **`server/tests/unit/team.assign-committee.test.js`**:
  - Ran via `npm test --workspace=server -- tests/unit/team.assign-committee.test.js`:
    Result: 16 passing tests in 203ms (`Duration 96.04s` due to setup/MongoMemoryServer initialization).
  - Explicitly asserts institutional committee rules:
    - Instructors cannot serve as Adviser (`/Course instructors cannot serve as a capstone adviser/`).
    - Instructors cannot serve as Secretary (`/Course instructors cannot serve as a committee secretary/`).
    - Instructors cannot serve as Panelists (`/Course instructors cannot serve as defense panelists/`).
    - Students cannot serve on committee.
    - Committee requires exactly 1 Adviser, 1 Secretary, 3 Panelists.
- **`server/tests/seeds/capstone-titles.seed.js`**:
  - Exports `CAPSTONE_TITLES` array and `seedCapstoneProjects()` function.
  - Used by `server/tests/integration/title-similarity.test.js` to seed in-memory data for tests.
  - Guards standalone execution: `const isMain = process.argv[1]?.includes('capstone-titles.seed'); if (isMain) { ... }`.
- **`scripts/test-all-roles-browser.mjs`**:
  - Playwright browser test that logs in with `DEFAULT_PASSWORD = 'Password123!'` across the canonical accounts. Currently checks 6 accounts; needs expansion to 11 in Milestone 5.

---

## 2. Logic Chain

1. **Standalone vs Integrated Seeding**:
   - `server/seeders/seed-canonical-role-accounts.js` is dedicated specifically to the canonical role accounts and runs standalone via `npm run seed:canonical`.
   - `server/seeders/index.js` is the full database seeder that resets the entire system (`deleteMany({})`).
   - Therefore, to satisfy Feature 15 ("Update `server/seeders/seed-canonical-role-accounts.js` and `server/seeders/index.js` to seed 11 dedicated canonical accounts"):
     - The canonical accounts definition array must be defined as an exported constant `CANONICAL_ROLE_ACCOUNTS` (or `seededAccounts`).
     - `seed-canonical-role-accounts.js` must be refactored so its execution function is exported and only self-invoked when executed as `main` (`process.argv[1]?.includes(...)`).
     - `server/seeders/index.js` can import or incorporate these 11 canonical accounts so full reseed maintains account consistency.

2. **Connection Resilience**:
   - Currently, `seed-canonical-role-accounts.js` hardcodes fallback to `mongodb://mongodb:27017/cms_v2`.
   - Outside Docker, this causes immediate `ENOTFOUND` crash.
   - Adopting the pattern from `seed-users-only.js` (`process.env.MONGODB_URI || process.env.MONGODB_DEV_FALLBACK_URI || 'mongodb://127.0.0.1:27017/cms_v2'`) ensures the script works seamlessly both inside Docker (`mongodb:27017`) and on host terminals (`127.0.0.1:27018` or `127.0.0.1:27017`).

3. **Non-Destructive Testing Strategy**:
   - Testing seeders by running them against MongoDB mutates or wipes the database, violating strict read-only/no-mutation rules during automated unit testing.
   - By exporting `CANONICAL_ROLE_ACCOUNTS` from `seed-canonical-role-accounts.js`, a dedicated unit test `server/tests/unit/seed-canonical-role-accounts.test.js` can test the entire account catalog in memory:
     - Verify exactly 11 accounts exist.
     - Verify emails match `@student.buksu.edu.ph`.
     - Verify role mappings (`student`, `instructor`, `faculty`).
     - Verify committee rules (1 Adviser, 1 Secretary, 3 Panelists with 1 Chair, zero Instructors in committee, zero Students in committee).
     - Verify account flags (`isVerified: true`, `isActive: true`, `authProvider: 'local'`).
     - Verify password property is plaintext `'Password123!'` so Mongoose's `pre('save')` hook properly hashes it without double-hashing corruption.

---

## 3. Caveats

1. **Docker vs Host Port Mapping**:
   - In `docker-compose.yml`, MongoDB is mapped to host port `27018` by default (`${MONGODB_PORT:-27018}:27017`). If executing `npm run seed:canonical` on Windows host, `.env` must define `MONGODB_URI=mongodb://127.0.0.1:27018/cms_v2` unless Docker is stopped and local mongod is on `27017`.
2. **Vitest Worker Setup Latency on Windows**:
   - Running `npm test --workspace=server -- <target>` on Windows can take 30–90 seconds due to `MongoMemoryServer` initialization in `tests/setup.js`. The test assertions themselves run in < 250ms.
3. **Dean Role Implementation**:
   - Per `shared/constants/roles.js`, primary roles are `student`, `instructor`, `faculty`. The Dean account should have `role: 'faculty'` (or institutional admin attributes) and email `dean@student.buksu.edu.ph`.

---

## 4. Conclusion

1. **Seeder Scripts**:
   - `npm run seed:canonical` executes `node seeders/seed-canonical-role-accounts.js` from `server/`.
   - `npm run seed` executes `node seeders/index.js`, which currently creates legacy accounts and does not import `seed-canonical-role-accounts.js`.
2. **Expansion Scope**:
   - `seed-canonical-role-accounts.js` must be expanded from 6 to 11 accounts:
     - 4 Students (Team Alpha): `student`, `student2`, `student3`, `student4`
     - 1 Course Instructor: `instructor`
     - 5 Faculty Committee: `adviser`, `secretary`, `panelchair`, `panelist2`, `panelist3`
     - 1 College Dean: `dean`
3. **Architecture Best Practice**:
   - Decouple account definitions (`CANONICAL_ROLE_ACCOUNTS`) from execution logic in `seed-canonical-role-accounts.js`.
   - Guard standalone execution so the file can be safely imported by test suites and `index.js`.
   - Use multi-host fallback (`process.env.MONGODB_URI || process.env.MONGODB_DEV_FALLBACK_URI || 'mongodb://127.0.0.1:27017/cms_v2'`).
4. **Testing Architecture**:
   - Create `server/tests/unit/seed-canonical-role-accounts.test.js` to test all 11 account specifications, committee invariants, and password hashing contracts in memory with zero database mutations.

---

## 5. Verification Method

### 5.1 Verification Commands for Worker, Reviewers, and Challengers

#### A. Fast Targeted Unit Test (Zero Database Mutation)
```bash
# Verify canonical role accounts data structure, invariants, roles, and password rules in memory
npm test --workspace=server -- tests/unit/seed-canonical-role-accounts.test.js
```

#### B. Committee Assignment & Role Guard Verification
```bash
# Verify committee role exclusion guards (no instructors on committee, 1 adviser, 1 secretary, 3 panelists)
npm test --workspace=server -- tests/unit/team.assign-committee.test.js

# Verify faculty role expansion in user queries
npm test --workspace=server -- tests/unit/user.service.faculty-query.test.js

# Verify password hashing & verification pool
npm test --workspace=server -- tests/unit/cryptoWorkerPool.test.js
```

#### C. Standalone Seeder Execution (When MongoDB is Running)
```bash
# Inside Docker or on host with running MongoDB:
npm run seed:canonical
```

#### D. End-to-End Multi-Role Browser Verification (For Milestone 5)
```bash
# Execute Playwright multi-role login & navigation sweep across all canonical accounts
node scripts/test-all-roles-browser.mjs
```

#### E. System & Governance Integrity Check
```bash
# Verify agentic system governance and boundary rules
npm run validate:agentic
```

### 5.2 Invalidation Conditions
- Any test that mutates or wipes the active development database during unit testing.
- Pre-hashing password strings before passing to `User.create()` or `user.save()`, which triggers double-hashing.
- Inclusion of `role: 'instructor'` in committee appointments.
- Fewer or more than 11 canonical accounts in `CANONICAL_ROLE_ACCOUNTS`.
- Failure to resolve MongoDB connection on host machines due to hardcoded `mongodb:27017`.
