# 🏛️ SYSTEM ARCHITECTURE, INSTITUTIONAL ROLES & CAPSTONE PROGRESSION

**Rule File:** `.agents/rules/01-architecture-and-governance.md`  
**Parent Blueprint:** [workspace-rules.md](file:///c:/Users/patri/dev/CMS-V2/.agents/rules/workspace-rules.md)  
**Compliance Standard:** ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  

---

## 1. MONOREPO ARCHITECTURE & TECHNOLOGY STACK

CMS-V2 is an integrated capstone lifecycle platform organized as an npm monorepo with containerized services:
* **Server Backend (`server/`)**: Express.js 5 REST API + Mongoose 9 ODM + Redis + BullMQ Asynchronous Task Queues.
* **Client Frontend SPA (`client/`)**: React 18 + Vite (dev server inside Docker container `cms-client`, port 43211) + Tailwind CSS + Zustand Store + TanStack React Query.
* **Plagiarism & Similarity Engine (`plagiarism_engine/`)**: FastAPI + Celery + ChromaDB (HNSW Vector Index) + PyTorch Sentence-Transformers (`BAAI/bge-m3` 1024-dim dense + sparse vector core) + Winnowing Fingerprinting.
* **OCR & Ingestion Microservice (`cms-ocr-engine`)**: Python FastAPI + PaddleOCR-VL (0.9B) vision-language model (`cms-ocr-engine:8000`) for automated PDF layout analysis and metadata extraction, integrated with BullMQ asynchronous queueing (`document-extraction`).
* **Shared Library (`shared/`)**: Canonical JSON schemas, role constants, and cross-platform validation utilities.
* **Tooling & Environment**: Node.js via `npm` workspaces; Python runtime via root `.venv/` virtual environment.

---

## 2. CANONICAL ACADEMIC CAPSTONE PROGRESSION (GROUND TRUTH)

The BukSU IT Department capstone progression operates under Phase 0 followed by three one-semester Capstone courses:

* **Phase 0: Registration & Team Scaffolding**:
  - Students verify institutional accounts and complete Student ID, Degree Program, Academic Term/Year, Section, and assigned Instructor profile data.
  - Teams of 1–4 members assemble, may hold only one active project per academic term, and assign 5 standardized proponent roles:
    1. `Project Lead & Systems Analyst`
    2. `Frontend & UI/UX Developer`
    3. `Backend & Database Developer`
    4. `Full-Stack Developer`
    5. `QA & Technical Documentor`
  - Roster locked via `PATCH /api/teams/:id/lock` before proposal submission.
* **Phase 1: Topic Proposals & Committee Assignment**:
  - Teams submit 1..10 candidate title proposals with discipline, problem statement, objectives, technical stack, and UN SDG tags (1..17).
  - Similarity screening warns at the configured threshold; the Capstone Instructor reviews proposals (`titleStatus = 'approved'`) and faculty committee roles are assigned.
* **Phase 2: Capstone 1 (Chapters 1–3 & Proposal Defense)**:
  - Chapters 1–3 pass sequential Adviser review before compilation.
  - Plagiarism clearance (`< 25%`), Adviser endorsement, scheduled defense, Secretary minutes, Action Done Matrix (`ADM v1`), panel evaluation, Instructor grade release, and required signatures gate course completion.
* **Phase 3: Capstone 2 (System Development & Prototype Defense)**:
  - The Adviser approves the Gantt schedule before daily progress logging.
  - Teams submit weekly progress and late justifications (`isLate`), link GitHub and media evidence, obtain Adviser prototype clearance, then complete the system defense, `ADM v2`, and guarded grade release.
* **Phase 4: Capstone 3 (Chapters 4–5 & Final Defense)**:
  - Chapters 4–5 pass sequential Adviser review. The team compiles the full academic manuscript and journal paper; both pass plagiarism checks before final defense.
  - 3-Tier Multi-Signatory `ADM v3` verification (Adviser, Panelists, Chair, Dean) strictly gated by Secretary Compliance Verification Endorsement (`project.admSignatures.secretary.endorsed === true`).
  - Instructor grade release, approval sheet generation, atomic auto-archival to S3/MinIO (`projectStatus = 'archived'`), and completion certificate issuance.

---

## 3. INSTITUTIONAL ROLE BOUNDARIES & COMMITTEE COMPOSITION RULES

To prevent conflicts of interest and preserve institutional academic hierarchy:

1. **Primary User Role Consolidation**:
   - Primary user account roles visible in user management (`/users`) are strictly: `student` (Student), `instructor` (Instructor), and `faculty` (Faculty) exported as `PRIMARY_ROLES` in `@cms/shared`.
   - Adviser, Secretary, Panelist, and Chair are committee appointments under the Faculty umbrella. In `user.service.js:listUsers`, querying `role: 'faculty'` automatically expands to `{ $in: ['faculty', 'adviser', 'panelist'] }`.
2. **Course Instructor Committee Exclusion**:
   - Course Instructors (`role: 'instructor'`) are **strictly prohibited** from serving as Adviser, Secretary, or Defense Panelists on capstone committees.
   - Client comboboxes (`useUsers({ role: 'faculty' })`) and backend services (`team.service.js:assignCommittee`) strictly reject instructor appointments.
3. **Committee Appointments & Composition**:
   - Defense committees consist of exactly 1 Adviser, 1 Secretary, and 3 Defense Panelists (Panelist 1 Lead/Chair, Panelist 2 Member, Panel Member 3), none labeled optional.
   - **Mutual Exclusion**: A faculty member cannot serve as both adviser/secretary and panelist on the same team, nor can panelists duplicate each other.
4. **Secretary Defense Workflow & ADM Compliance Gate**:
   - In Phase 4, `project.admSignatures.secretary.endorsed === true` is an immutable prerequisite before Tier 1 (Adviser), Tier 2 (Panelists/Chair), and Tier 3 (Dean) digital signatures can unlock.
   - In `ActionDoneMatrixTab.jsx`, an institutional Secretary Compliance Verification Gate banner appears above Tier 1, locking committee signatures when endorsement is pending.

---

## 4. HIGH-PERFORMANCE CODEBASE NAVIGATION DIRECTIVES

To preserve cognitive context and avoid unbounded scans:
1. **Index-First Orientation**: Check [FILES_INDEX.md](file:///c:/Users/patri/dev/CMS-V2/FILES_INDEX.md) and route definitions before running symbol searches.
2. **Bounded Line-Slice Inspection**: View target symbols using `StartLine` and `EndLine` slices. Never dump full files into prompts.
3. **Caller-Callee Chain Tracing**: Trace call chains end-to-end: UI Component $\to$ Hook/Store $\to$ API Service $\to$ Express Route $\to$ Controller $\to$ Mongoose Model.
4. **Endpoint Parity Assurance**: Verify that every client API call has an exact matching server route via `npm run check:endpoints` (`UNMATCHED_COUNT = 0`).
5. **Concrete Syntax Tree (CST) Preservation**: Modify code via surgical replacements targeting exact line spans. Preserve existing JSDoc comments and formatting.
