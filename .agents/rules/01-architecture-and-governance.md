# 🏛️ SYSTEM ARCHITECTURE, INSTITUTIONAL ROLES & CAPSTONE PROGRESSION

**Rule File:** `.agents/rules/01-architecture-and-governance.md`  
**Parent Blueprint:** [workspace-rules.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/workspace-rules.md)  
**Compliance Standard:** ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  

---

## 1. MONOREPO ARCHITECTURE & TECHNOLOGY STACK

CMS-V2 is an integrated capstone lifecycle platform organized as an npm monorepo with containerized services:
* **Server Backend (`server/`)**: Express.js 5 REST API + Mongoose 9 ODM + Redis + BullMQ Asynchronous Task Queues.
* **Client Frontend SPA (`client/`)**: React 18 + Vite (dev server inside Docker container `cms-client`, port 43211) + Tailwind CSS + Zustand Store + TanStack React Query.
* **Plagiarism & Similarity Engine (`plagiarism_engine/`)**: FastAPI + Celery + ChromaDB (HNSW Vector Index) + PyTorch Sentence-Transformers (`all-MiniLM-L6-v2`) + Winnowing Fingerprinting.
* **Shared Library (`shared/`)**: Canonical JSON schemas, role constants, and cross-platform validation utilities.
* **Tooling & Environment**: Node.js via `npm` workspaces; Python runtime via root `.venv/` virtual environment.

---

## 2. CANONICAL ACADEMIC CAPSTONE PROGRESSION (GROUND TRUTH)

The BukSU IT Department capstone progression operates under a strictly sequenced **4-Phase Progression** preceded by Phase 0:

* **Phase 0: Team Formation & Roster Locking**:
  - Teams of 2–4 members assemble, bind to Academic Year / Course / Section.
  - Assign exactly 5 standardized proponent roles:
    1. `Project Lead & Systems Analyst`
    2. `Frontend & UI/UX Developer`
    3. `Backend & Database Developer`
    4. `Full-Stack Developer`
    5. `QA & Technical Documentor`
  - Roster locked via `PATCH /api/teams/:id/lock`. Course Instructor appoints committee.
* **Phase 1: Capstone 1 (Title Defense & Proposal Pre-Scan)**:
  - Proponents draft 1..10 candidate proposals tagged with UN SDGs (1..17) and IT disciplines (1..10).
  - Live archive cosine similarity pre-scan. Proposal defense hearing rubrics determine title approval (`titleStatus = 'approved'`).
* **Phase 2: Capstone 2 (Chapters 1–3 Manuscript & Midterm Defense)**:
  - Chapters 1–3 uploaded. Dual plagiarism scan (Winnowing + SentenceTransformers, `< 25%`).
  - Midterm oral defense evaluation. Action Done Matrix (`ADM v1`) logs panel remarks and multi-signatory digital sign-off.
* **Phase 3: Capstone 3 (System Development & Progress Defense)**:
  - Full prototype implementation with Interactive Gantt Tracker (4 milestone sections).
  - Late justification gating (`isLate`), Chapter 4 (Results) & Chapter 5 (Conclusions), progress demo, and `ADM v2` sign-off.
* **Phase 4: Capstone 4 (Final Defense, Multi-Tier ADM Sign-Off & Archival)**:
  - Full 5-chapter manuscript compilation, deep vector plagiarism scan, final oral defense hearing.
  - 3-Tier Multi-Signatory ADM verification (Adviser, Panelists, Chair, Dean) strictly gated by Secretary Compliance Verification Endorsement (`project.admSignatures.secretary.endorsed === true`).
  - Atomic auto-archival to S3/MinIO (`projectStatus = 'archived'`), and sealed completion certificate PDF generation.

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
1. **Index-First Orientation**: Check [FILES_INDEX.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/FILES_INDEX.md) and route definitions before running symbol searches.
2. **Bounded Line-Slice Inspection**: View target symbols using `StartLine` and `EndLine` slices. Never dump full files into prompts.
3. **Caller-Callee Chain Tracing**: Trace call chains end-to-end: UI Component $\to$ Hook/Store $\to$ API Service $\to$ Express Route $\to$ Controller $\to$ Mongoose Model.
4. **Endpoint Parity Assurance**: Verify that every client API call has an exact matching server route via `npm run check:endpoints` (`UNMATCHED_COUNT = 0`).
5. **Concrete Syntax Tree (CST) Preservation**: Modify code via surgical replacements targeting exact line spans. Preserve existing JSDoc comments and formatting.
