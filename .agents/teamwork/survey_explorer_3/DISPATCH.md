# DISPATCH — survey_explorer_3

## Mission: Seed Accounts, Auth & E2E Browser Testing Infrastructure Survey (R4)

- **Role**: Seed Accounts and Test Infra Miner (`teamwork_spec_miner`)
- **Parent Conversation ID**: ed92d340-7260-43d5-8952-0ac19a527b4f
- **State Folder**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_3\
- **Working Directory**: c:\Users\patri\dev\CMS-V2
- **Original Request File**: c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md
- **Reference Skills**:
  - `c:\Users\patri\dev\CMS-V2\.agents\skills\automated-qa-tester\SKILL.md`
  - `c:\Users\patri\dev\CMS-V2\.agents\skills\anti-regression-and-ci-governance\SKILL.md`

## Instructions:
1. Read `c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md` and reference skills.
2. Investigate the authentication and user management system:
   - Check `server/seeders/`, `server/models/User.js`, password hashing, login endpoints (`/api/auth/login`), JWT handling, and existing seed users.
   - Map out the exact list of dedicated seed accounts needed for each role:
     - Student (e.g. Lead, Member 2)
     - Instructor
     - Faculty members for committee roles: Adviser, Secretary, Panelist 1 (Chair), Panelist 2, Panelist 3
     - Dean (for Tier 3 ADM sign-off)
   - Determine how dedicated seed accounts can be created or seeded safely without violating Pile B rules.
3. Investigate the browser testing environment and infrastructure:
   - Check Playwright setup (`playwright.config.*`, headless browser runners, dependencies in package.json, scripts in `scratch/` or `client/e2e/`).
   - Note CMS-V2 specific requirements: real-time network polling (`networkidle` is strictly banned; use `domcontentloaded` + targeted locators), explicit scratchpad timeouts (110s safety net), process cleanup.
   - Design the E2E browser automation architecture to execute realistic end-to-end scenario testing across all role workflows from browser navigation (no simulated finishes).
4. Compile your findings into `.agents/teamwork/survey_explorer_3/survey_report.md` with:
   - Specification of dedicated seed accounts (emails, passwords, roles, initial state).
   - End-to-end browser testing harness architecture and execution plan.
   - Step-by-step role scenario scripts and validation checkpoints.
5. Deliver a self-contained `handoff.md` and notify the parent orchestrator via `send_message`.


## 2026-11-14T01:28:06Z
Received from parent (ed92d340-7260-43d5-8952-0ac19a527b4f):
You are survey_explorer_3. Read your instructions in c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_3\DISPATCH.md and c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md.
Investigate the authentication system, user seeders, dedicated seed accounts needed for all roles (Student, Instructor, Adviser, Secretary, Panelists, Chair, Dean), and the E2E browser testing harness / execution architecture using Playwright without simulated finishes.
Write your comprehensive findings to c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_3\survey_report.md and your handoff to c:\Users\patri\dev\CMS-V2\.agents\teamwork\survey_explorer_3\handoff.md.
When finished, notify your parent orchestrator via send_message with the path to your handoff report.
