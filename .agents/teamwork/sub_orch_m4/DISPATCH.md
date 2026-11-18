# DISPATCH — sub_orch_m4

## Mission: Milestone 4 — Dedicated Seed Accounts & Seeder Expansion (R4)

- **Role**: Milestone 4 Sub-Orchestrator (`self`)
- **Parent Conversation ID**: ed92d340-7260-43d5-8952-0ac19a527b4f
- **State Folder**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m4\
- **Working Directory**: c:\Users\patri\dev\CMS-V2
- **Original Request File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- **Project Scope File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- **Relevant Survey Findings**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_3\survey_report.md

## Scope & Target Deliverables:
1. **Dedicated Seed Accounts Expansion (Feature 15)**:
   - Update `server/seeders/seed-canonical-role-accounts.js` and `server/seeders/index.js` to seed 11 dedicated canonical accounts:
     1. `student@student.buksu.edu.ph` (Student Lead - Team Alpha)
     2. `student2@student.buksu.edu.ph` (Student Member 2 - Team Alpha)
     3. `student3@student.buksu.edu.ph` (Student Member 3 - Team Alpha)
     4. `student4@student.buksu.edu.ph` (Student Member 4 - Team Alpha)
     5. `instructor@student.buksu.edu.ph` (Course Instructor)
     6. `adviser@student.buksu.edu.ph` (Capstone Adviser - Team Alpha)
     7. `secretary@student.buksu.edu.ph` (Committee Secretary - Team Alpha)
     8. `panelchair@student.buksu.edu.ph` (Defense Panel Chair - Team Alpha)
     9. `panelist2@student.buksu.edu.ph` (Defense Panelist 2 - Team Alpha)
     10. `panelist3@student.buksu.edu.ph` (Defense Panelist 3 - Team Alpha)
     11. `dean@student.buksu.edu.ph` (College Dean - Tier 3 Signatory)
2. **Authentication & Committee Integrity (Feature 16)**:
   - Ensure all accounts use standardized password `Password123!`, `isVerified: true`, `isActive: true`.
   - Maintain strict institutional separation: Course Instructor (`role: 'instructor'`) is strictly excluded from committee appointments.
   - Distinct faculty members are mapped to Adviser, Secretary, Chair, Panelist 2, and Panelist 3 without duplication.
   - Verify seeder syntax, dry-run seeder, and ensure unit tests pass (`npm test --workspace=server -- tests/unit/`).

## Exclusive File Boundaries:
- `server/seeders/seed-canonical-role-accounts.js`
- `server/seeders/index.js`
- `server/tests/unit/seeder.test.js` or test fixtures

## Procedure:
Follow the Sub-orchestrator procedure:
1. Initialize your `SCOPE.md`, `BRIEFING.md`, and `progress.md` in your state folder.
2. Execute the Iteration Loop (2B):
   - a. Spawn Explorer (`teamwork_explorer`) to inspect existing seeder records and schemas.
   - b. Spawn Worker (`teamwork_worker`) with the mandatory integrity warning to implement the seeder additions and verify hashing/roles.
   - c. Spawn 2 Reviewers (`teamwork_reviewer`) independently to inspect role boundaries and credentials.
   - d. Spawn 2 Challengers (`teamwork_challenger`) to verify accounts against `User` model validation and authentication tests.
   - e. Spawn Forensic Auditor (`teamwork_auditor`) for integrity verification.
   - f. Evaluate Gate in `GATE_STATUS.md`.
3. When gate passes, write your `handoff.md` and notify parent via `send_message`.
