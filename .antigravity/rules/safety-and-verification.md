# CMS-V2 Safety, Verification & File Protection Policy

This document defines strict security and verification constraints enforced by the autonomous agentic loop.

---

## 1. File Modification Restrictions (Protected Resources)

The agent must **NEVER** edit, truncate, or overwrite the following sensitive files and directories without explicit, confirmed user instruction:

### A. Environment & Secret Files
- `**/.env*` (including `.env`, `.env.prod`, `.env.deploy`, `.env.example`, `.env.prod.example`, `server/.env`, `plagiarism_engine/.env*`)
- Reason: Contains sensitive credentials (JWT secrets, SMTP keys, OAuth secrets, database credentials, AWS S3 keys).

### B. Database Migrations & Production Seeders
- `server/seeders/**` (e.g. `index.js`, `seed-archived-capstone-pdfs.js`, `reseed-target-users.js`)
- Reason: Changes can cause irreversible data loss or corruption of production/staging databases.

### C. Core Infrastructure & Deployment Automation
- `docker-compose*.yml`
- `Dockerfile*`
- `infra/**`
- `deploy.ps1`, `lan-deploy.ps1`, `rebuild-prod.ps1`, `start-*.ps1`
- Reason: Changes impact container networking, security flags, volumes, and deployment integrity.

---

## 2. Mandatory Test Verification Policy

Before marking any coding task or refactor complete, the agent **MUST** run and verify the test suite:

1. **Backend Tests**:
   - Command: `npm test --workspace=server`
   - Framework: Vitest (`server/vitest.config.js`)
   - Verification: All test suites in `server/tests/` must pass with zero failures.

2. **Frontend Tests**:
   - Command: `npm test --workspace=client`
   - Framework: Vitest + React Testing Library (`client/vitest.config.js`)
   - Verification: All client component and store tests must pass with zero failures.

3. **Plagiarism Engine Tests**:
   - Command: `.venv\Scripts\python.exe -m pytest plagiarism_engine/tests` (if applicable)

---

## 3. Terminal Safety & Destructive Command Interception

The following shell commands and patterns are strictly blocked by pre-execution safety gates:
- Recursive file/directory deletions (`rm -rf`, `rmdir /s /q`, `Remove-Item -Recurse -Force` on root/critical directories)
- Database drop/truncate operations (`db.dropDatabase()`, `DROP DATABASE`, `TRUNCATE TABLE`, `redis-cli flushall`, `redis-cli flushdb`)
- Hard git resets that destroy uncommitted user work (`git reset --hard`, `git clean -fdx`)
