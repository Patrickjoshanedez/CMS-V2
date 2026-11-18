# Handoff Report: Mongoose User Model, Role Schemas, Committee Invariants, and 11 Seed Accounts

**Explorer**: `sub_orch_m4_explorer_2`  
**State Folder**: `c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m4_explorer_2`  
**Working Directory**: `c:\Users\patri\dev\CMS-V2`  
**Target Milestone**: Milestone 4 (Dedicated Seed Accounts & Seeder Expansion)  
**Status**: Completed (Read-Only Investigation)  

---

## 1. Observation

### 1.1 User Mongoose Model & Schema (`server/modules/users/user.model.js`)
Inspection of `server/modules/users/user.model.js` (lines 13–248) confirms the schema structure:
```javascript
// server/modules/users/user.model.js:13-71
firstName: {
  type: String,
  required: [true, 'First name is required'],
  trim: true,
  minlength: [2, 'First name must be at least 2 characters'],
  maxlength: [50, 'First name must not exceed 50 characters'],
},
middleName: {
  type: String,
  trim: true,
  maxlength: [50, 'Middle name must not exceed 50 characters'],
  default: '',
},
lastName: {
  type: String,
  required: [true, 'Last name is required'],
  trim: true,
  minlength: [2, 'Last name must be at least 2 characters'],
  maxlength: [50, 'Last name must not exceed 50 characters'],
},
email: {
  type: String,
  required: [true, 'Email is required'],
  unique: true,
  lowercase: true,
  trim: true,
  match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
},
password: {
  type: String,
  required: [
    function () {
      return this.authProvider === 'local';
    },
    'Password is required',
  ],
  minlength: [8, 'Password must be at least 8 characters'],
  select: false, // Never returned in queries by default
},
authProvider: {
  type: String,
  enum: ['local', 'google'],
  default: 'local',
},
googleId: {
  type: String,
  unique: true,
  sparse: true,
},
role: {
  type: String,
  enum: {
    values: ROLE_VALUES,
    message: 'Role must be one of: ' + ROLE_VALUES.join(', '),
  },
  default: ROLES.STUDENT,
},
facultyRole: {
  type: String,
  enum: {
    values: [...FACULTY_ROLE_VALUES, null],
    message: 'Faculty role must be one of: ' + FACULTY_ROLE_VALUES.join(', '),
  },
  default: null,
},
isVerified: {
  type: Boolean,
  default: false,
},
isActive: {
  type: Boolean,
  default: true,
},
sessionVersion: {
  type: Number,
  default: 0,
  min: 0,
},
teamId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Team',
  default: null,
},
sectionId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Section',
  default: null,
},
instructorId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null,
},
studentId: {
  type: String,
  trim: true,
  maxlength: [32, 'Student ID must not exceed 32 characters'],
  default: '',
},
academicTerm: {
  type: String,
  enum: [...ACADEMIC_TERM_VALUES, null],
  default: null,
},
digitalSignature: {
  type: String,
  default: null,
},
panelAssignments: [
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    role: {
      type: String,
      enum: {
        values: PANEL_ROLE_VALUES,
        message: 'Panel role must be one of: ' + PANEL_ROLE_VALUES.join(', '),
      },
      required: true,
    },
  },
],
```

### 1.2 Password Hashing Pre-Save Hook & Instance Method
In `server/modules/users/user.model.js:227–244`:
```javascript
// --- Pre-save hook: hash password via off-thread Piscina worker pool ---
userSchema.pre('save', async function () {
  // Skip hashing for Google OAuth users (no password) or unmodified passwords
  if (!this.password || !this.isModified('password')) return;

  const rounds = process.env.BCRYPT_ROUNDS ? parseInt(process.env.BCRYPT_ROUNDS, 10) : 10;
  this.password = await hashPassword(this.password, rounds);
});

// --- Instance methods ---
userSchema.methods.comparePassword = async function (candidatePassword) {
  return verifyPassword(candidatePassword, this.password);
};
```
In `server/utils/cryptoWorkerPool.js:21–77` and `server/utils/cryptoTask.js:14–32`, `hashPassword` and `verifyPassword` dispatch CPU-intensive bcrypt calculations to a Piscina thread pool running `bcrypt.hash(plainPassword, salt)` and `bcrypt.compare(plainPassword, hashedPassword)`.

### 1.3 Shared Role Constants (`shared/constants/roles.js`)
Inspection of `shared/constants/roles.js:7–62` reveals:
```javascript
export const ROLES = Object.freeze({
  STUDENT: 'student',
  FACULTY: 'faculty',
  ADVISER: 'adviser',
  PANELIST: 'panelist',
  INSTRUCTOR: 'instructor',
});

export const FACULTY_ROLES = Object.freeze({
  ADVISER: 'adviser',
  PANELIST: 'panelist',
});

export const PANEL_ROLES = Object.freeze({
  CHAIR: 'chair',
  MEMBER: 'member',
  SECRETARY: 'secretary',
});

export const ROLE_VALUES = Object.values(ROLES); // ['student', 'faculty', 'adviser', 'panelist', 'instructor']
export const PANEL_ROLE_VALUES = Object.values(PANEL_ROLES); // ['chair', 'member', 'secretary']
export const FACULTY_ROLE_VALUES = Object.values(FACULTY_ROLES); // ['adviser', 'panelist']

export const PRIMARY_ROLES = Object.freeze({
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  FACULTY: 'faculty',
});
export const PRIMARY_ROLE_VALUES = Object.values(PRIMARY_ROLES); // ['student', 'instructor', 'faculty']
```
Direct finding:
- `'dean'` is **NOT** present in `ROLES`, `ROLE_VALUES`, or `PRIMARY_ROLES`.
- `'secretary'` is **NOT** present in `ROLES` or `ROLE_VALUES` (it is strictly a `PANEL_ROLES` value on a project/team).
- `'chair'` is **NOT** present in `ROLES` or `ROLE_VALUES` (it is strictly a `PANEL_ROLES` value).

### 1.4 Committee Structure in Team & Project Models
In `server/modules/teams/team.model.js:136–155`:
```javascript
adviserId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null,
},
secretaryId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null,
},
panelistIds: {
  type: [mongoose.Schema.Types.ObjectId],
  ref: 'User',
  default: [],
},
projectId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Project',
  default: null,
},
```
In `server/modules/projects/project.model.js:854–880`:
```javascript
adviserId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null,
},
secretaryId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  default: null,
},
panelistIds: {
  type: [mongoose.Schema.Types.ObjectId],
  ref: 'User',
  validate: {
    validator: (arr) => arr.length <= 5,
    message: 'A project can have at most 5 panelists (Chair + Members + Secretary)',
  },
  default: [],
},
panelists: {
  type: [panelistAssignmentSchema], // [{ userId: ObjectId, role: 'chair' | 'member' | 'secretary' }]
  validate: {
    validator: (arr) => arr.length <= 5,
    message: 'A project can have at most 5 panelists (Chair + Members + Secretary)',
  },
  default: [],
},
```

### 1.5 Committee Assignment & Institutional Role Exclusions (`server/modules/teams/team.service.js:1899–2086`)
In `team.service.js`:
1. **Max and Exact Panelists**:
   ```javascript
   // line 1929-1935
   if (effectivePanelistIds.length > 3) {
     throw new AppError('A defense committee must have exactly 3 panelists.', 400, 'MAX_PANELISTS_EXCEEDED');
   }
   ```
2. **Mutual Exclusion Between Adviser, Secretary, and Panelists**:
   ```javascript
   // line 1938-1960
   if (effectiveAdviserId && effectiveAdviserId === effectiveSecretaryId) {
     throw new AppError('The adviser and committee secretary cannot be the same faculty member on the same team.', 400, 'ROLE_CONFLICT');
   }
   if (effectiveAdviserId && effectivePanelistIds.includes(effectiveAdviserId)) {
     throw new AppError('A faculty adviser cannot serve as a defense panelist on the same team.', 400, 'ROLE_CONFLICT');
   }
   if (effectiveSecretaryId && effectivePanelistIds.includes(effectiveSecretaryId)) {
     throw new AppError('A committee secretary cannot serve as a defense panelist on the same team.', 400, 'ROLE_CONFLICT');
   }
   ```
3. **No Duplicate Panelists**:
   ```javascript
   // line 1963-1970
   const uniquePanelists = new Set(effectivePanelistIds);
   if (uniquePanelists.size !== effectivePanelistIds.length) {
     throw new AppError('Defense panelists cannot contain duplicate faculty members.', 400, 'DUPLICATE_PANELISTS');
   }
   ```
4. **Strict Instructor & Student Exclusion**:
   ```javascript
   // line 1980-2051
   if (adviser.role === ROLES.INSTRUCTOR || adviser.role === 'instructor') {
     throw new AppError('Course instructors cannot serve as a capstone adviser. Please appoint a verified faculty member.', 400, 'INVALID_COMMITTEE_ROLE');
   }
   if (secretary.role === ROLES.INSTRUCTOR || secretary.role === 'instructor') {
     throw new AppError('Course instructors cannot serve as a committee secretary. Please appoint a verified faculty member.', 400, 'INVALID_COMMITTEE_ROLE');
   }
   for (const p of panelists) {
     if (p.role === ROLES.INSTRUCTOR || p.role === 'instructor') {
       throw new AppError(`Course instructors cannot serve as defense panelists (${p.firstName} ${p.lastName} is an instructor). Please appoint verified faculty members.`, 400, 'INVALID_COMMITTEE_ROLE');
     }
   }
   ```
5. **Project Synchronization**:
   ```javascript
   // line 2065-2076
   const structuredPanelists = (team.panelistIds || []).map((pId, idx) => ({
     userId: pId,
     role: idx === 0 ? 'chair' : 'member',
   }));
   if (team.secretaryId && !(team.panelistIds || []).some((p) => toId(p) === toId(team.secretaryId))) {
     structuredPanelists.push({ userId: team.secretaryId, role: 'secretary' });
   }
   project.panelists = structuredPanelists;
   ```
6. **Complete Committee Definition**:
   ```javascript
   // line 2081-2086
   const isFullyAssigned =
     Boolean(team.adviserId) &&
     Boolean(team.secretaryId) &&
     Array.isArray(team.panelistIds) &&
     team.panelistIds.length === 3;
   ```

### 1.6 Authentication Invariants (`server/modules/auth/auth.service.js:194–225`)
In `auth.service.js:login`:
```javascript
if (!user.isVerified) {
  throw new AppError('Please verify your email before logging in.', 401, 'EMAIL_NOT_VERIFIED');
}
if (!user.isActive) {
  throw new AppError('Your account has been deactivated.', 401, 'ACCOUNT_DEACTIVATED');
}
```
All seeded accounts must have `isVerified: true` and `isActive: true`.

---

## 2. Logic Chain

1. **Schema Role Enum Validation**:
   - Mongoose User model enforces `role: { enum: ROLE_VALUES }`, where `ROLE_VALUES = ['student', 'faculty', 'adviser', 'panelist', 'instructor']`.
   - Any seed account created with `role: 'dean'`, `role: 'secretary'`, `role: 'chair'`, or `role: 'panelchair'` will trigger Mongoose schema validation failure: `ValidationError: Role must be one of: student, faculty, adviser, panelist, instructor`.
   - Therefore, `secretary@student.buksu.edu.ph`, `panelchair@student.buksu.edu.ph`, and `dean@student.buksu.edu.ph` must all be persisted with valid roles: `role: 'faculty'` (or `role: 'panelist'` for panel chair).

2. **Faculty Umbrella & Multi-Hat Architecture**:
   - `shared/constants/roles.js` and `AGENTS.md` establish `PRIMARY_ROLES = ['student', 'instructor', 'faculty']`.
   - In `user.service.js:261–266`, querying `role: 'faculty'` automatically expands via `{ $in: ['faculty', 'adviser', 'panelist'] }`.
   - In `client/src/components/dashboards/FacultyDashboard.jsx:35–46`, faculty accounts operate with three multi-hat view modes: `Adviser View`, `Panelist View`, and `Secretary View`.
   - The user's role on a specific capstone is bound via `team.adviserId`, `team.secretaryId`, and `project.panelists: [{ userId, role: 'chair' | 'member' | 'secretary' }]`.

3. **Institutional Committee Composition Rules**:
   - `team.service.js:assignCommittee` requires:
     - 1 Adviser (`adviserId`)
     - 1 Secretary (`secretaryId`)
     - 3 Panelists (`panelistIds` of length 3; index 0 becomes `'chair'`, indices 1 & 2 become `'member'`)
   - All 5 committee positions must be distinct faculty members (no overlaps between adviser, secretary, and panelists).
   - `role: 'instructor'` is strictly prohibited from serving on committees (`INVALID_COMMITTEE_ROLE`).
   - Therefore, a fully verified capstone lifecycle requires at least 5 distinct faculty accounts (`adviser`, `secretary`, `panelchair`, `panelist2`, `panelist3`).

4. **Dean Sign-Off & Role Mapping**:
   - The Dean provides Tier 3 sign-off on the Action Done Matrix and signs the final Capstone 3 Approval Sheet (`projectArchive.service.js`).
   - Because `dean` is not a separate Mongoose role enum, the Dean account (`dean@student.buksu.edu.ph`) must be seeded with `role: 'faculty'`, with institutional metadata representing the College Dean.

5. **Password Lifecycle & Double-Hashing Immunity**:
   - `userSchema.pre('save')` hashes `password` when `isModified('password')` is true.
   - When seeders create accounts via `User.create({ ..., password: 'Password123!' })` or `user.save()`, the plaintext string triggers `pre('save')`, producing a valid single-pass bcrypt hash.
   - If a seeder manually pre-hashes the password via `await bcrypt.hash('Password123!', 10)` before passing it to `User.create()`, the pre-save hook executes again on the hash string, resulting in double-hashing corruption that breaks subsequent login authentication.
   - Seed payloads must always provide plaintext `password: 'Password123!'` and allow the Mongoose hook to execute normally.

6. **Student Roster Composition**:
   - `team.model.js:5` defines `MAX_TEAM_MEMBERS = 4`.
   - Team Alpha requires 4 students: 1 Leader (`student@student.buksu.edu.ph`) and 3 Members (`student2@student.buksu.edu.ph`, `student3@student.buksu.edu.ph`, `student4@student.buksu.edu.ph`).
   - Each student account requires `role: 'student'`, valid `studentId`, `isVerified: true`, and `isActive: true`.

---

## 3. Caveats

1. **Email Domain Conventions**:
   - In production self-registration (`auth.validation.js:registerSchema`), students register with `@student.buksu.edu.ph` and faculty with `@buksu.edu.ph`.
   - However, in test/seed environments and per user specifications (PROJECT.md / SCOPE.md), all 11 canonical accounts use the test domain format `@student.buksu.edu.ph` (e.g. `instructor@student.buksu.edu.ph`, `adviser@student.buksu.edu.ph`, `dean@student.buksu.edu.ph`).
   - Mongoose User schema email validation uses regex `/^\S+@\S+\.\S+$/`, and `auth.service.js:login` uses `loginSchema` (which allows any valid email domain). Direct Mongoose seeding and subsequent login with `@student.buksu.edu.ph` works across all roles without conflict.
2. **Backward Compatibility with Legacy Roles**:
   - `ROLE_VALUES` retains legacy `'adviser'` and `'panelist'` alongside `'faculty'`.
   - In `seed-canonical-role-accounts.js`, the existing 6 accounts used `role: 'adviser'` and `role: 'panelist'`.
   - While `role: 'adviser'` and `role: 'panelist'` remain valid in Mongoose, the canonical standard under `@cms/shared` and `AGENTS.md` is `role: 'faculty'` with `facultyRole: 'adviser' | 'panelist' | null`. Both are supported by `user.service.js:listUsers`.
3. **No Faculty ID Field in User Schema**:
   - The User Mongoose schema contains `studentId` and legacy `schoolId`, but does NOT contain a `facultyId` or `employeeId` field. Passing `facultyId` will be ignored by Mongoose strict schema mode.

---

## 4. Conclusion & Concrete Recommendations

### The 11 Canonical Seed Accounts Specification
The 11 seed accounts must be defined with the following exact payload structure:

```javascript
const CANONICAL_SEED_ACCOUNTS = [
  // ── 1. Team Alpha Lead ──
  {
    email: 'student@student.buksu.edu.ph',
    firstName: 'Bennettchristiangeofferdon',
    middleName: '',
    lastName: 'Student',
    role: 'student',
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
    studentId: '2023-0001',
    targetTeam: 'Team Alpha',
    teamRole: 'Project Lead & Systems Analyst',
  },
  // ── 2. Team Alpha Member 2 ──
  {
    email: 'student2@student.buksu.edu.ph',
    firstName: 'John Jethro',
    middleName: '',
    lastName: 'Israel',
    role: 'student',
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
    studentId: '2023-0002',
    targetTeam: 'Team Alpha',
    teamRole: 'Frontend & UI/UX Developer',
  },
  // ── 3. Team Alpha Member 3 ──
  {
    email: 'student3@student.buksu.edu.ph',
    firstName: 'Gabriel',
    middleName: 'Mark',
    lastName: 'Diaz',
    role: 'student',
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
    studentId: '2023-0003',
    targetTeam: 'Team Alpha',
    teamRole: 'Backend & Database Developer',
  },
  // ── 4. Team Alpha Member 4 ──
  {
    email: 'student4@student.buksu.edu.ph',
    firstName: 'Nicole',
    middleName: 'Faith',
    lastName: 'Aguilar',
    role: 'student',
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
    studentId: '2023-0004',
    targetTeam: 'Team Alpha',
    teamRole: 'QA & Technical Documentor',
  },
  // ── 5. Course Instructor (Excluded from Committee) ──
  {
    email: 'instructor@student.buksu.edu.ph',
    firstName: 'Patrick Josh',
    middleName: 'S.',
    lastName: 'Añedez',
    role: 'instructor',
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
  },
  // ── 6. Capstone Adviser ──
  {
    email: 'adviser@student.buksu.edu.ph',
    firstName: 'Leon',
    middleName: '',
    lastName: 'Mentor',
    role: 'faculty',
    facultyRole: 'adviser',
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
  },
  // ── 7. Committee Secretary ──
  {
    email: 'secretary@student.buksu.edu.ph',
    firstName: 'Clarissa',
    middleName: 'S.',
    lastName: 'Secretary',
    role: 'faculty',
    facultyRole: 'panelist',
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
  },
  // ── 8. Defense Panel Chair (Panelist 1 Lead) ──
  {
    email: 'panelchair@student.buksu.edu.ph',
    firstName: 'Steven Joe',
    middleName: '',
    lastName: 'Bautista',
    role: 'faculty',
    facultyRole: 'panelist',
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
  },
  // ── 9. Defense Panelist 2 ──
  {
    email: 'panelist2@student.buksu.edu.ph',
    firstName: 'Raul',
    middleName: '',
    lastName: 'Lecaros',
    role: 'faculty',
    facultyRole: 'panelist',
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
  },
  // ── 10. Defense Panelist 3 ──
  {
    email: 'panelist3@student.buksu.edu.ph',
    firstName: 'Eduardo',
    middleName: 'M.',
    lastName: 'Morales',
    role: 'faculty',
    facultyRole: 'panelist',
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
  },
  // ── 11. College Dean ──
  {
    email: 'dean@student.buksu.edu.ph',
    firstName: 'Sales',
    middleName: 'G.',
    lastName: 'Aribe Jr.',
    role: 'faculty',
    facultyRole: null,
    password: 'Password123!',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
  },
];
```

### Team Alpha Committee Binding Implementation Rule
In `server/seeders/seed-canonical-role-accounts.js` and `server/seeders/index.js`, Team Alpha and its Project must be bound as:
```javascript
// 1. Team Model Roster & Committee
teamAlpha.leaderId = student1._id;
teamAlpha.members = [student1._id, student2._id, student3._id, student4._id];
teamAlpha.memberRoles = [
  { userId: student1._id, role: 'Project Lead & Systems Analyst' },
  { userId: student2._id, role: 'Frontend & UI/UX Developer' },
  { userId: student3._id, role: 'Backend & Database Developer' },
  { userId: student4._id, role: 'QA & Technical Documentor' },
];
teamAlpha.adviserId = adviser._id;
teamAlpha.secretaryId = secretary._id;
teamAlpha.panelistIds = [panelChair._id, panelist2._id, panelist3._id];
teamAlpha.isLocked = true;
await teamAlpha.save();

// 2. Project Model Committee Synchronization
projectAlpha.adviserId = adviser._id;
projectAlpha.secretaryId = secretary._id;
projectAlpha.panelistIds = [panelChair._id, panelist2._id, panelist3._id];
projectAlpha.panelists = [
  { userId: panelChair._id, role: 'chair' },
  { userId: panelist2._id, role: 'member' },
  { userId: panelist3._id, role: 'member' },
  { userId: secretary._id, role: 'secretary' },
];
await projectAlpha.save();
```

---

## 5. Verification Method

### 5.1 Unit Tests for Role and Query Compatibility
Run fast-path targeted vitest tests:
```bash
npm test --workspace=server -- tests/unit/user.service.faculty-query.test.js
npm test --workspace=server -- tests/unit/auth.registration-role.test.js
npm test --workspace=server -- tests/unit/auth.registration-domain.test.js
```

### 5.2 Seeder Invariant Verification
Inspect the seeder implementation:
1. Confirm `DEFAULT_PASSWORD = 'Password123!'` is passed directly to `User.create` / `user.set`.
2. Confirm no calls to `await bcrypt.hash` are assigned to `userPayload.password`.
3. Confirm all 11 accounts have `isVerified: true` and `isActive: true`.
4. Confirm `teamAlpha.panelistIds` has length 3 and contains no duplicates, advisers, secretaries, or instructors.
5. Confirm `teamAlpha.secretaryId` is set to `secretary._id` and distinct from all panelists and the adviser.

### 5.3 Invalidation Conditions
This report is invalidated if:
1. `ROLE_VALUES` in `shared/constants/roles.js` is modified to add new top-level roles.
2. `user.model.js` alters its `pre('save')` hook to accept pre-hashed passwords or disable bcrypt salting.
3. `team.service.js` alters committee sizing from 1 adviser, 1 secretary, 3 panelists.
