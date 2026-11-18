# Scope: Milestone 4 — Dedicated Seed Accounts & Seeder Expansion

## Architecture
- **Mongoose User Model & Schema**: `server/models/user.model.js` or `server/models/User.js`
- **Canonical Seeder**: `server/seeders/seed-canonical-role-accounts.js` and `server/seeders/index.js`
- **Role Hierarchy**:
  - Primary roles: `student`, `instructor`, `faculty`
  - Committee roles: `adviser`, `secretary`, `panelist`, `chair` (under faculty umbrella, excluded for instructors)
  - College Dean: Role `faculty` (or admin/dean per institutional model)
- **Account Credentials**: Default password `Password123!`, `isVerified: true`, `isActive: true`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 15 | Dedicated Seed Accounts Expansion | Update `server/seeders/seed-canonical-role-accounts.js` and `server/seeders/index.js` to seed 11 dedicated canonical accounts (Student Lead/Members, Instructor, Adviser, Secretary, Panelists 1–3, Dean) | M4 | Survey 3 / DISPATCH.md |
| 16 | Seed Account Authentication Invariants | Ensure seed accounts have verified status, valid bcrypt hashed passwords (`Password123!`), correct roles and faculty appointments, and satisfy committee composition rules | M4 | Survey 3 / DISPATCH.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M4.1 | Exploration & Seeder Audit | Analyze existing seeder files, User schema, password hashing, and role requirements | none | IN_PROGRESS |
| M4.2 | Implementation & Local Tests | Expand seeders to include all 11 accounts and verify test coverage | M4.1 | PLANNED |
| M4.3 | Independent Verification & Audit | Reviewers, Challengers, and Forensic Auditor verification | M4.2 | PLANNED |

## Interface Contracts
### Dedicated Seed Accounts Contract (M4)
- 11 canonical accounts:
  1. `student@student.buksu.edu.ph` (Student Lead - Team Alpha, role: 'student')
  2. `student2@student.buksu.edu.ph` (Student Member 2 - Team Alpha, role: 'student')
  3. `student3@student.buksu.edu.ph` (Student Member 3 - Team Alpha, role: 'student')
  4. `student4@student.buksu.edu.ph` (Student Member 4 - Team Alpha, role: 'student')
  5. `instructor@student.buksu.edu.ph` (Course Instructor, role: 'instructor', strictly excluded from committee)
  6. `adviser@student.buksu.edu.ph` (Capstone Adviser - Team Alpha, role: 'faculty')
  7. `secretary@student.buksu.edu.ph` (Committee Secretary - Team Alpha, role: 'faculty')
  8. `panelchair@student.buksu.edu.ph` (Defense Panel Chair - Team Alpha, role: 'faculty')
  9. `panelist2@student.buksu.edu.ph` (Defense Panelist 2 - Team Alpha, role: 'faculty')
  10. `panelist3@student.buksu.edu.ph` (Defense Panelist 3 - Team Alpha, role: 'faculty')
  11. `dean@student.buksu.edu.ph` (College Dean, role: 'faculty' with dean privileges/attributes)
- Default credentials: password `Password123!`, `isVerified: true`, `isActive: true`.
- Zero password hash corruption (bcrypt pre-save hook vs direct hashing).
- Zero instructor presence in faculty committee lists.

## Code Layout
- `server/seeders/seed-canonical-role-accounts.js`
- `server/seeders/index.js`
- `server/models/` (User model)
- `server/tests/unit/`
