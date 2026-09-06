# 🤖 COGNITIVE BOUNDARY & RUNTIME CONTRACT FOR CODING AGENTS (AGENTS.md)
**Target Platform:** BukSU Capstone Management System V2 (CMS-V2)  
**Security Level:** Hard-Bounded Execution Sandbox  
**Compliance Standard:** ASDLC v2.0-Ready  

---

## 1. PURPOSE AND SYSTEM OVERVIEW

This document establishes the **immutable operational boundaries, architectural expectations, and deterministic quality gates** for all AI Coding Agents, Copilots, and Orchestrator loops operating inside the CMS-V2 repository. 

To prevent **workspace clutter, split-brain desynchronisation, and "silent gray errors,"** every agent MUST read, parse, and strictly comply with these instructions before executing tool actions or modifying files.

### Canonical Academic Capstone Workflow (Ground Truth)
The BukSU IT Department capstone progression operates under a strictly sequenced **4-Phase Capstone Progression** preceded by Phase 0:
*   **Phase 0: Team Formation & Roster Locking:** Teams of 2–4 members assemble, bind to Academic Year / Course / Section, and assign 5 standardized roles (`Project Lead & Systems Analyst`, `Frontend & UI/UX Developer`, `Backend & Database Developer`, `Full-Stack Developer`, `QA & Technical Documentor`). Roster locked via `PATCH /api/teams/:id/lock`. Instructor appoints committee (Adviser, Chair, Secretary, Panelists).
*   **Phase 1: Capstone 1 (Title Defense & Proposal Pre-Scan):** Proponents draft 1..10 title proposals tagged with SDGs (1..17). Live archive cosine similarity pre-scan. Proposal defense hearing rubrics determine title approval (`titleStatus = 'approved'`).
*   **Phase 2: Capstone 2 (Chapters 1–3 Manuscript & Midterm Defense):** Chapters 1–3 uploaded. Plagiarism Scan v1 (Winnowing + SentenceTransformers, `< 25%`). Midterm defense evaluation. Action Done Matrix (`ADM v1`) logs panel remarks and multi-signatory digital sign-off.
*   **Phase 3: Capstone 3 (System Development & Progress Defense):** Full prototype implementation with Interactive Gantt Chart (4 milestone sections), late justification gating (`isLate`), Chapter 4 (Results) & Chapter 5 (Conclusions), progress defense rubric evaluation, and `ADM v2` sign-off.
*   **Phase 4: Capstone 4 (Final Defense, Multi-Tier ADM Sign-Off & Archival):** Full 5-chapter manuscript compilation, deep vector plagiarism scan, final oral defense hearing, 3-Tier Multi-Signatory ADM verification (Adviser, Panelists, Chair, Dean) gated by Secretary Compliance Verification Endorsement (`project.admSignatures.secretary.endorsed = true`), atomic auto-archival to S3/MinIO (`projectStatus = 'archived'`), and sealed completion certificate PDF generation.

### Institutional Role Boundaries & Committee Composition Rules
To prevent conflicts of interest and preserve institutional hierarchy:
1.  **Primary User Role Consolidation:** Primary user account roles visible in user management (`/users`) are strictly: `student` (Student), `instructor` (Instructor), and `faculty` (Faculty) exported as `PRIMARY_ROLES` in `@cms/shared`. Adviser, Secretary, Panelist, and Chair are committee appointments under the Faculty umbrella (`user.service.js:listUsers` expands `role: 'faculty'` to `{ $in: ['faculty', 'adviser', 'panelist'] }`).
2.  **Course Instructor Committee Exclusion:** Course Instructors (`role: 'instructor'`) are **strictly prohibited** from serving as Adviser, Secretary, or Defense Panelists on capstone committees. Both client comboboxes (`useUsers({ role: 'faculty' })`) and backend services (`team.service.js:assignCommittee`) strictly reject instructor appointments.
3.  **Committee Appointments & Composition:** Defense committees consist of exactly 1 Adviser, 1 Secretary, and 3 Defense Panelists (Panelist 1 Lead/Chair, Panelist 2 Member, Panel Member 3), none labeled optional. A faculty member cannot serve as both adviser/secretary and panelist on the same team, nor can panelists duplicate each other.
4.  **Secretary Defense Workflow & ADM Compliance Gate:** In Phase 4, `project.admSignatures.secretary.endorsed === true` is an immutable prerequisite before Tier 1 (Adviser), Tier 2 (Panelists/Chair), and Tier 3 (Dean) digital signatures can unlock. In `ActionDoneMatrixTab.jsx`, an institutional Secretary Compliance Verification Gate banner appears above Tier 1, locking committee signatures when endorsement is pending.

---

## 2. THE TWO-PILE INSTRUCTION ARCHITECTURE

Every agent operates under a strict **Two-Pile Governance Model** to prevent context compaction from erasing safety policies:

### Pile A: Soft Steering Guidelines (Subject to drift)
*   **Language Standard:** ECMAScript 2022 (ES13) for Node.js backend modules; React 18 with modern React Hooks and custom state abstractions (Zustand, React Query) for the frontend client.
*   **Design System:** Tailwind CSS utilizing design system CSS variable tokens (`bg-background`, `text-foreground`). Hardcoded hex colors and literal dark classes (e.g., `#020617`, `bg-slate-950`) are prohibited on functional components.
*   **Code Quality:** Maximize modularity. Consolidate repetitive tasks behind shared hooks under `client/src/hooks` and centralized utility functions.

### Pile B: Hard Survival Rules (Deterministic & Externally Enforced)
*   **Rule 0: Chat-Starter Preflight Snapshot (Absolute Top Priority):** Before chatting, planning, or executing tasks, check for and ensure the active chat-starter snapshot exists in `.agents/ptss/chat-starter.json` as specified in [.agents/rules/00-chat-starter-protocol.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/00-chat-starter-protocol.md).
*   **Playwright Visual Feedback Loop (Strict Design Rule):** All UI, UX, styling, component, and layout modifications in `client/src/` MUST execute a Playwright visual feedback loop (light mode, dark mode, desktop 1440x900, mobile 390x844) to inspect rendered output before declaring completion.
*   **Restricted Files:** Do not edit or overwrite environment secret files (`.env*`). Do not modify database seeders (`server/seeders/*`) or deployment automation scripts (`docker-compose*.yml`, `deploy.ps1`, `lan-deploy.ps1`, `infra/*`) without explicit confirmation.
*   **No Unbounded File Reading:** Full repository dumps, broad wildcard searches, and recursive `cat` style dumps are strictly prohibited. Agents must use structured file indexers or targeted line-range viewers.
*   **No Direct Database Mutations:** Direct raw MongoDB, Redis, or ChromaDB mutations via terminal scripts are blocked. All state changes must occur via the official API service layers.
*   **Dual-Persistence Memory Architecture:** Persistent agent execution trajectories, session states, and HLLM lessons are maintained strictly under `.agents/ptss/` (structured session JSONs & `index.jsonl`) and `memories/repo/` (technical context & lessons). Any auxiliary memory file written to the workspace root or unapproved paths will trigger an immediate pre-commit rejection.

---

## 3. REPOSITORY DIRECTORY LAYOUT & WHITELIST BOUNDARIES

To prevent a **Workspace Clutter Crisis**, the workspace maintains a strict whitelist. The creation of unvetted folders or loose scripts in the root directory is blocked.

```
/workspace/
├── client/                           ← React 18 Tailwind Frontend SPA
├── server/                           ← Node.js / Express.js REST API Backend
├── plagiarism_engine/                ← PyTorch & Winnowing Plagiarism API (FastAPI)
├── shared/                           ← Shared schema & utility workspace
├── scripts/                          ← All deployment, migration, and seeder scripts
├── docs/                             ← System specifications, guidelines, and manuals
├── assets/                           ← Media, logos, and static graphics
├── memories/                         ← HLLM repo lessons, interaction hooks, and technical context
├── .git/                             ← Local Git repository metadata
├── .agents/                          ← Shared memory, PTSS sessions, and execution trajectories
└── scratch/                          ← Intermediate developer scratch space
```

### File Write Whitelist
*   **Allowed Write Areas:** `client/src/`, `server/`, `plagiarism_engine/`, `shared/`, `scripts/`, `docs/`, `.agents/`, `memories/`, and `scratch/`.
*   **Strictly Prohibited:** No new root-level folders. No loose `.sh`, `.py`, or `.ps1` scripts in root (all scripts must live under `scripts/`).
*   **Shadow Tree Ban:** Files must never be written to or read from dead development trees (e.g., `staging/`, `dashboard-ui/`, `references/`).

---

## 4. CODE NAVIGATION & COGNITIVE-LOAD PRINCIPLES

1.  **Inspect Before Editing:** Always check if a target file has an existing, active implementation before writing a new version.
2.  **Targeted CST Patching:** Never overwrite complete files to implement minor edits. Identify exact line ranges and generate surgical diffs. Preserve all existing developer comments and JSDoc annotations exactly.
3.  **Validate Imports:** Verify all relative module import paths (`@/...`, `../../services/...`) against the actual directory structure. Do not assume module names.

---

## 5. RE-DEFENSE COMPLIANCE VERIFICATION SUITES & TARGETED TESTING PROTOCOL

A task is marked completed **only** when all local linters, compilers, and unit tests return a zero-error exit code.

### Fast-Path Targeted Testing Rule (Development & Iteration)
To eliminate test delays (running the full 43+ test suites takes ~90–120s on Windows) and avoid runaway watchdog timeouts, agents and developers MUST use **Targeted Testing** during iterative implementation, debugging, and focused component work. Target only the specific test files or directories affected:

```bash
# Targeted Client Test (runs in 1–5 seconds instead of ~90s)
npm test --workspace=client -- <path-to-test-file>

# Examples:
npm test --workspace=client -- src/pages/projects/CreateProjectPage.test.jsx
npm test --workspace=client -- src/components/projects/AlignmentSelectorDialog.test.jsx
npm test --workspace=client -- src/components/projects/DisciplineCombobox.test.jsx

# Targeted Component Directory Pattern:
npm test --workspace=client -- src/components/projects/

# Targeted Server Unit or Integration Test (runs in 1–4 seconds):
npm test --workspace=server -- tests/unit/<module>.test.js
```

### Full Compliance Battery (Final Task Closure)
Once targeted tests pass and work is ready for final sign-off, run the governance and full compliance suites:

```bash
# Validate the overall Agentic Governance & Security policies
npm run validate:agentic

# Validate the React Frontend unit and store tests (or targeted suite if strictly scoped)
npm test --workspace=client

# Validate the Express Backend integration and unit suites
npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js
```

---

## 6. GIT POST-COMMIT TAGGING & AUTOMATED VERSIONING

The repository implements an automated post-commit hook `.git/hooks/post-commit` (and `.husky/post-commit`) that manages semantic tagging via `scripts/git-auto-tag.py`. Every commit message must be structured according to the following matrix:

| Commit Message Flag | Action Taken | Target Version Transition |
| :--- | :--- | :--- |
| **`feat: [major] ...`** | Increments Major version, resets minor/patch | `v1.1.0` $\rightarrow$ `v2.0.0` |
| **`feat: [minor] ...`** | Increments Minor version, resets patch | `v1.0.0` $\rightarrow$ `v1.1.0` |
| **`fix: ...` (default)** | Increments Patch version | `v1.1.0` $\rightarrow$ `v1.1.1` |

*   **Double-Tag Protection:** The tagging engine parses the current HEAD. If the commit already carries a semantic tag, the tag operation is skipped to prevent infinite git loop pipelines.

---

## 7. RUNAWAY WATCHDOGS & INFINITE LOOP CONTAINMENT

To protect token consumption and pipeline resources, the execution loop is actively monitored by an external watchdog:
*   **Max Iterations:** Hard capped at **15 turns**.
*   **Max Time:** Strict **300-second (5-minute)** wall-clock timeout.
*   **State-Hashing Watchdog:** Generates a SHA-256 hash across the serialized message trajectory and filesystem states at every turn. If a matching hash is discovered in the execution history, the agent is repeating actions without making progress—and the system will immediately terminate the loop.

---

## 8. HUMAN-IN-THE-LOOP (HITL) GATES

High-consequence actions must pause and request explicit human verification:
1.  **Database Seeding:** Any scripts modifying standard catalog records (`server/seeders/*`).
2.  **Production Releases:** Pushing tags beyond the major version line.
3.  **ADM Signatures:** Applying final digital signature hashes to the Action Done Matrix.

The agent will serialize its execution state, output a secure token, enter a sleep phase, and resume only when a valid human authorization signature is received.

---

## 9. ADVANCED CONTEXT GATHERING & COGNITIVE EFFICIENCY DIRECTIVES

To maximize agent performance, eliminate context compaction errors, and streamline development:

1.  **Skills Dictionary Mandatory Lookup:** The catalog under `.agents/skills/` is the authoritative Skills Dictionary. In specific domain scenarios (backend architecture, frontend state/UI, design polish, capstone workflows, verification loops, SRE), agents MUST inspect and adhere to the matching skill first before generating code or taking action.
2.  **Continuous Skill Gap Updating:** When using any skill from the Skills Dictionary, if execution reveals missing steps, unhandled edge cases, or drifted paths, the agent MUST update/patch `SKILL.md` (via surgical CST diffs or `skill-write-or-patch`) to close the gap.
3.  **Bounded Context Inspection:** Agents must NEVER perform unbounded file dumps or full-directory `cat` commands. Search symbols via targeted `grep_search` and inspect code via bounded line-ranges (`StartLine`/`EndLine`).
4.  **AST / CST Precision Patching:** Full-file rewrites are strictly prohibited. Edits must be surgical CST diffs targeting specific function or schema nodes, preserving all existing developer comments and JSDocs.
5.  **Zero-Slop Standard:** Code must use production-grade design tokens (`bg-background`, `text-foreground`, `border-border/60`), proper error boundaries, explicit prop validation, and zero mock placeholders.
6.  **Rule 0 Preflight & Chat-Starter Verification:** Before chatting or executing code, verify/create `.agents/ptss/chat-starter.json` as specified in [.agents/rules/00-chat-starter-protocol.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/00-chat-starter-protocol.md).
7.  **Session Startup Memory Recall:** At the start of ANY new session/chat, the agent MUST inspect the recent sessions in `.agents/ptss/index.jsonl` (latest 2-3 sessions) and `memories/repo/CMS-V2-Technical-Context.md` to establish context and verify the current architectural state before taking action.
8.  **Dual-Persistence Session Memory:** Archive all meaningful tasks and skill patches to `.agents/ptss/sessions/YYYY-MM-DD_<task-slug>.json`, append to `.agents/ptss/index.jsonl`, and record learned runbooks to `memories/repo/CMS-V2-Technical-Context.md` or `memories/repo/lessons/` (with required keywords: `lesson`, `learned`, `prevention`, `runbook`, `checklist`).
9.  **Targeted Testing First (Zero-Lag Verification):** NEVER run full workspace test suites (`npm test --workspace=client`, full server suite) on small iterative changes or during debugging loops. Always execute fast, targeted test commands (`npm test --workspace=client -- <target-test-file>`) to achieve 1–5 second feedback cycles. Full workspace suites are reserved strictly for final quality gates or broad refactoring.
10. **Strict Playwright Visual Feedback Loop for Design:** For any UI/UX or styling modification in `client/src/`, agents MUST execute Playwright visual capture scripts in `scratch/` across light mode, dark mode, desktop (1440x900), and mobile (390x844) viewports.
11. **ASDLC [v2.0] 8-Stage Execution Lifecycle:** All agents operate strictly within the 8 stages: Stage 0 (Startup Preflight), Stage 1 (Intent Decomposition & Skill Lookup), Stage 2 (Targeted Context Gathering), Stage 3 (Structural Inspection), Stage 4 (Statechart-Driven Orchestration), Stage 5 (Surgical CST Editing), Stage 6 (Deterministic Verification), Stage 7 (HITL Gating), and Stage 8 (Fix Auditing & Dual-Persistence Archival).
12. **Supreme Cognitive Protocols & Kernel Engineering Standards:** Adhere to the 6 kernel principles (Keep It Simple, Easy to Verify, Reproducible, Narrow Scope, Explicit Constraints, CST Precision Patching) and cognitive vulnerability guards (Execution Signal Dominance with isolated scratchpad tests in `scratch/`, Session Startup Recall, Three-Cycle Break Rule, and Mutation Testing).
13. **Docker Container Dependency Synchronization:** The Vite client development server runs in Docker container `cms-client`. When installing or updating npm dependencies (`npm install --workspace=client <pkg>`), agents MUST also install inside the container (`docker exec cms-client npm install --workspace=client <pkg>`) and restart it (`docker restart cms-client`) to prevent Vite overlay module resolution failures. Visual audit scripts must check for Vite errors before screenshotting.
14. **Defensive Entity Prefix Normalization:** Database records and user inputs may already contain institutional classification prefixes (e.g. `team.name = "Team Gamma"`). Presenter components must sanitize raw strings with regex (e.g. `team.name.replace(/^Team\s+/i, '').trim()`) to prevent duplicate prefix bugs such as `"Team Team Gamma"`.
15. **16:9 Presentation Canvas & Overflow Isolation:** Slide decks and presentation previews must adhere to a strict 16:9 widescreen canvas (`aspect-video`, `LAYOUT_16x9`), using flex column layout with space distribution (`flex flex-col justify-between`), responsive typography (`text-sm sm:text-base lg:text-lg`), dedicated navigation bars external to slide content, and keyboard listeners guarded against active text input focus.

---


## 10. UNIFIED QUALITY GATE VERIFICATION SEQUENCE

Before declaring any implementation task complete, agents MUST run and pass the 7-point verification battery with zero errors. During iterative development, use **Fast-Path Targeted Testing (Step 4 & 5)**:

```bash
# 1. API Route Parity Check (196 Server / 175 Client, UNMATCHED_COUNT = 0)
npm run check:endpoints

# 2. Agentic System Governance Audit (60/60 checks)
npm run validate:agentic

# 3. Agent Communication & Governance Pipeline
npm run validate:governance

# 4. React Frontend Unit & Institutional Fidelity Tests
# FAST-PATH ITERATION (1–5s): npm test --workspace=client -- <target-test-file>
# FULL GATE CLOSURE (~90s):   npm test --workspace=client
npm test --workspace=client

# 5. Express Server 13-Stage Comprehensive Workflow Tests
# FAST-PATH ITERATION (1–4s): npm test --workspace=server -- <target-test-file>
# FULL WORKFLOW GATE (~22s):  npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js
npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js

# 6. Workspace Cleanliness & Cognitive Guardrail
python scripts/workspace_guardrail.py

# 7. Playwright Visual Audit Gate (Mandatory for client UI/UX modifications)
node scratch/<feature>_audit.mjs
```

