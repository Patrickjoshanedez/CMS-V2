# Architectural Critique & Comprehensive Improvement Proposal — CMS-V2

**Document Version:** 1.0.0  
**Date:** October 12, 2026  
**Audited System:** BukSU Capstone Management System V2 (CMS-V2)  
**Stack:** React 18 / Vite 8, Express 5 / Node 20, MongoDB 7 / Mongoose 8, Redis 7 / BullMQ 5, Python 3.11 / FastAPI / Celery / ChromaDB / PyTorch, MinIO / AWS S3, Ollama  

---

## 1. Executive Summary & Architectural Maturity Assessment

CMS-V2 is a robust, ambitious academic workflow system integrating complex business requirements: multi-role capstone governance (Students, Advisers, Panelists, Instructors, Department Secretaries), dual-engine originality verification (Rabin-Karp winnowing + semantic vector embeddings), real-time Action Done Matrix (ADM) compliance, and digital defense scheduling.

### Architectural Maturity Radar

| Dimension | Score (1–10) | Current State | Target State |
|---|---|---|---|
| **Feature Completeness** | **9 / 10** | End-to-end workflows from proposal to archiving are implemented. | Preserve 100% of workflows while optimizing stability. |
| **Test Coverage & Verification** | **8 / 10** | Comprehensive integration suites, endpoint mapping validation, agentic preflight guardrails. | Maintain zero-regression guarantees during refactoring. |
| **Modularity & Separation of Concerns** | **4 / 10** | "God-Services" (5,581 lines) and monolithic UI components (3,208 lines). | Domain-Driven Design (DDD) with focused sub-services and atomic UI components. |
| **Query Performance & Caching** | **5 / 10** | Redis is underutilized; deep 4-level populate cascades; unindexed compound queries. | Centralized Redis query caching, compound indexes, lean projections. |
| **Component State Management** | **4 / 10** | "State hoisting to the sky" with 20–32 `useState` hooks per monolithic component. | Headless custom hooks, Zustand domain stores, isolated memoized cells. |
| **Infrastructure & Inter-service Decoupling** | **6 / 10** | Hybrid Node + Python + Ollama containers with dual Redis instances. | Resilient configuration, unified caching contract, scoped network topologies. |

**Overall Architectural Score: 6.0 / 10** — *High functional capability, burdened by extreme monolithic implementation debt.*

---

## 2. In-Depth Architectural Critique

### 2.1 Backend Architecture: The "God-Service" Anti-Pattern

#### Critique
The system's architecture documentation ([`docs/ARCHITECTURE.md`](file:///C:/Users/patri/dev/CMS-V2/docs/ARCHITECTURE.md)) prescribes a clean 4-file pattern per module (`validation`, `service`, `controller`, `routes`). However, the implementation has degraded into severe monolithic coupling:

1. **`server/modules/projects/project.service.js` (5,581 lines, 186 KB):**
   - Violates the Single Responsibility Principle (SRP) by managing **11 distinct sub-domains**:
     - Project CRUD & proposal metadata
     - Title similarity calculation & clearance gating
     - Revision workflow & modification requests
     - Committee assignments (Advisers, Panelists, Secretaries) & faculty workload distribution
     - Milestone deadlines & section-wide deadline propagation
     - Capstone phase progression (Phases 1, 2, and 3)
     - Prototype uploads & external links
     - Archival search, DOI resolution & legacy capstone imports
     - Certificate uploads & storage URL presigning
     - Defense session scheduling & calendar conflict resolution
     - Direct PDF binary generation (`_generateFallbackManuscriptPdf`) using `pdf-lib` inside the service!
2. **`server/modules/submissions/submission.service.js` (3,788 lines, 129 KB):**
   - Contains 197 internal methods and functions mixing HTTP upload handling, OCR text extraction, BullMQ job queuing, DOCX conversion, Word XML comment parsing, review state machines, and manuscript diffing.
3. **`server/modules/projects/project.controller.js` (2,013 lines, 74 KB):**
   - Controllers are no longer "thin"; they perform data shaping, fallback URL resolution, error translation, and direct service orchestrations.

#### Consequences
- **High Blast Radius:** Editing a defense scheduling rule risks inadvertently breaking title approval or archive searches.
- **Merge Conflicts:** Multiple developers or agentic workflows touching project logic frequently collide in `project.service.js`.
- **Testing Overhead:** Test suites take nearly 10 minutes to run because services instantiate massive dependencies and models.

---

### 2.2 Database & Data Modeling: Cascading Populations & Dual-Truth Hazards

#### Critique
1. **Deep Population Cascades:**
   In `project.service.js` and `submission.service.js`, queries routinely cascade `.populate()` across 3 to 4 distinct collections:
   ```javascript
   // Anti-Pattern: Deep nested populates without field selection
   Submission.find({ projectId })
     .populate('projectId')
     .populate('submittedBy', 'firstName lastName role')
     .populate({
       path: 'projectId',
       populate: { path: 'teamId', populate: { path: 'members' } }
     })
   ```
   Each nested populate executes a separate query against MongoDB. On an active cohort of 100 projects, a single dashboard load or submissions listing can generate hundreds of queries.
2. **Dual-Truth & Reference Redundancy:**
   - `Team` has `members: [UserId]`, `leaderId: UserId`, and `projectId: ProjectId`.
   - `Project` has `teamId: TeamId`, `adviserId: UserId`, `panelistIds: [UserId]`, and `secretaryId: UserId`.
   - `User` has `teamId: TeamId`.
   When a student changes teams or a leader is reassigned, updates must touch 3 collections simultaneously. If an error occurs midway, documents become desynchronized because MongoDB multi-document transactions (`session.withTransaction`) are not consistently utilized.
3. **Query Inefficiencies:**
   Queries filtering on `{ isArchived: { $ne: true } }` force MongoDB to scan documents where the field is `false` or non-existent, bypassing index range scans unless compound sparse indexes are carefully maintained.

---

### 2.3 Frontend Architecture: Monolithic Components & State Hoisting

#### Critique
The client-side architecture contains components exceeding 3,000 lines:

| Component | Lines | State Primitives | Architectural Issue |
|---|---|---|---|
| [`TeamsPage.jsx`](file:///C:/Users/patri/dev/CMS-V2/client/src/pages/teams/TeamsPage.jsx) | **3,208** | 32 `useState`, 3 `useEffect` | Blends team roster, invites, permissions, leader transfer, committee assignment, and student search. |
| [`ActionDoneMatrixTab.jsx`](file:///C:/Users/patri/dev/CMS-V2/client/src/components/projects/ActionDoneMatrixTab.jsx) | **3,029** | 26 `useState`, 6 `useEffect` | Table rendering, inline cell editing, revision history, filtering, signature verification in one file. |
| [`SecretaryMinutesDocumentSheet.jsx`](file:///C:/Users/patri/dev/CMS-V2/client/src/components/secretary/SecretaryMinutesDocumentSheet.jsx) | **2,813** | 11 `useState`, 3 `useEffect` | Huge un-paginated tabular DOM for remarks and multi-signatory digital signatures. |
| [`DefenseSchedulingPage.jsx`](file:///C:/Users/patri/dev/CMS-V2/client/src/pages/instructor/DefenseSchedulingPage.jsx) | **2,775** | 22 `useState`, 3 `useEffect` | Calendar rendering, conflict resolution, room allocation, panelist availability in a single component. |
| [`AcademicExcelGanttChart.jsx`](file:///C:/Users/patri/dev/CMS-V2/client/src/components/projects/AcademicExcelGanttChart.jsx) | **2,490** | 18 `useState`, 9 `useEffect` | Timeline calculations and spreadsheet grid rendering tightly coupled. Wrapped by `InteractiveGanttChart.jsx` (865 lines) = **3,355 lines combined**. |

#### Consequences
- **Re-render Cascades:** In React, when any `useState` setter is called, the entire component re-renders. Typing in an input inside `ActionDoneMatrixTab.jsx` re-evaluates 3,000 lines of JSX and loops over remarks arrays.
- **Lack of Reusability:** Logic cannot be reused across views without duplicating code.

---

### 2.4 Infrastructure & Microservices Architecture

#### Critique
1. **Dual Redis Instances:**
   `docker-compose.yml` runs two separate Redis 7 containers: `cms-redis` (Node.js queues) and `cms-plagiarism-redis` (Python Celery broker). While isolating Celery memory is acceptable, both use identical configurations without shared telemetry.
2. **Disconnected In-Memory Caching:**
   [`server/utils/pdfMetadataExtractor.js`](file:///C:/Users/patri/dev/CMS-V2/server/utils/pdfMetadataExtractor.js) manages independent `Map` caches (`extractionCache`, `doiMetadataCache`) in process memory, which are lost upon server restart and cannot be shared across multiple Node.js cluster processes.
3. **Permissive Global Request Sizing:**
   [`server/app.js`](file:///C:/Users/patri/dev/CMS-V2/server/app.js) applies `express.json({ limit: '50mb' })` globally. High JSON payload limits should only apply to dedicated file upload routes; applying it globally exposes the server to memory exhaustion attacks.

---

## 3. The Target Architecture: Modular Domain-Driven Monolith (DDD)

We propose evolving CMS-V2 from an accidental monolith into a **Modular Domain-Driven Monolith (Modular Monolith)**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER (React 18)                         │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐  │
│  │  Pages (Route Shells) │  │  Domain Custom Hooks  │  │  Zustand Stores │  │
│  │  < 150 lines per file │  │  (Headless Logic)     │  │  (Cross-page)   │  │
│  └───────────┬───────────┘  └───────────┬───────────┘  └────────┬────────┘  │
│              │                          │                       │           │
│              ▼                          ▼                       ▼           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │         Atomic / Presentational UI Components (< 250 lines)           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS / JSON / Cookies
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND CORE (Express 5)                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    API Gateway / Routing & Security                   │  │
│  │   Auth, Rate Limiting, Scoped Payload Guards (2MB global, 50MB uploads)│  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│  ┌───────────────────────────────────┴───────────────────────────────────┐  │
│  │                       DOMAIN SERVICES LAYER                           │  │
│  │  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────┐  │  │
│  │  │  ProjectDomain        │  │  SubmissionDomain     │  │ TeamDomain│  │  │
│  │  │  ├─ TitleService      │  │  ├─ UploadService     │  │ ├─ Roster │  │  │
│  │  │  ├─ CommitteeService  │  │  ├─ ReviewService     │  │ ├─ Invites│  │  │
│  │  │  ├─ DefenseService    │  │  └─ DiffService       │  │ └─ Access │  │  │
│  │  │  └─ ArchiveService    │  │                       │  │           │  │  │
│  │  └───────────────────────┘  └───────────────────────┘  └───────────┘  │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│  ┌───────────────────────────────────┴───────────────────────────────────┐  │
│  │                      INFRASTRUCTURE ADAPTERS                          │  │
│  │  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────┐  │  │
│  │  │ CacheService (Redis)  │  │ StorageService (S3)   │  │ PdfEngine │  │  │
│  │  │ (Stats, Settings, DOI)│  │ (MinIO / Presigned)   │  │ (Gotenberg│  │  │
│  │  └───────────────────────┘  └───────────────────────┘  └───────────┘  │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
                 ┌─────────────────────┴─────────────────────┐
                 ▼                                           ▼
┌──────────────────────────────────┐       ┌──────────────────────────────────┐
│             DATA TIER            │       │         INTELLIGENCE TIER        │
│  MongoDB (Replica Set / Txns)    │       │  Plagiarism API (FastAPI / CUDA) │
│  Redis (Shared Cache & BullMQ)   │       │  Ollama (Llama 3.2 + Nomic-Embed)│
└──────────────────────────────────┘       └──────────────────────────────────┘
```

---

## 4. Comprehensive Architectural Improvement Proposal

### 4.1 Backend Domain Decomposition Plan

Decompose the two "God-Services" into targeted, decoupled sub-services with clear interface boundaries:

#### Refactoring `project.service.js` (5,581 lines -> 5 targeted sub-services)
```
server/modules/projects/
├── services/
│   ├── projectCore.service.js       # CRUD, stage transitions, phase checks (<400 lines)
│   ├── projectTitle.service.js      # Proposals, revisions, similarity verification (<600 lines)
│   ├── projectCommittee.service.js  # Advisers, panelists, secretaries, workload (<500 lines)
│   ├── projectDefense.service.js    # Scheduling, calendar, conflict resolution (<500 lines)
│   └── projectArchive.service.js    # DOI extraction, certificates, legacy ingest (<600 lines)
├── project.service.js               # Facade delegating to sub-services (backward compatible)
├── project.controller.js            # Refactored thin controllers (<400 lines)
└── project.routes.js
```

#### Refactoring `submission.service.js` (3,788 lines -> 3 targeted sub-services)
```
server/modules/submissions/
├── services/
│   ├── submissionUpload.service.js  # Upload handling, S3 storage, MIME validation (<400 lines)
│   ├── submissionReview.service.js  # Workflow review, approvals, Word comments (<500 lines)
│   └── submissionDiff.service.js    # Version comparison, diff generation (<350 lines)
├── submission.service.js            # Facade delegating to sub-services
├── submission.controller.js         # Refactored thin controllers (<300 lines)
└── submission.routes.js
```

#### Moving PDF Generation to Infrastructure
Extract `_generateFallbackManuscriptPdf` from `project.service.js` into:
`server/services/pdfGenerator.service.js`  
This decouples binary document synthesis from project business logic.

---

### 4.2 Frontend State & Component Decomposition Plan

#### Strategy: Headless Custom Hooks + Atomic Components
Convert monolithic pages into a 3-layer architecture:
1. **Route Page Shell (< 150 lines):** Handles route params, layout, and top-level Suspense boundaries.
2. **Headless Domain Hook:** Encapsulates all state primitives, mutations, and effects.
3. **Compound Presentational Components (< 250 lines):** Pure, memoized UI elements that receive props and callbacks.

#### Decomposition Breakdown:

1. **`ActionDoneMatrixTab.jsx` (3,029 lines):**
   - Extract hook: `useActionDoneMatrix(projectId, user)` (manages remarks, active editing, filters).
   - Extract components:
     - `ADMTableView.jsx`: Memoized table grid.
     - `ADMRemarkRow.jsx`: Memoized row renderer using `React.memo`.
     - `ADMSignatureModal.jsx`: Committee digital signing dialog.
     - `ADMComplianceBadge.jsx`: Stage indicator.

2. **`TeamsPage.jsx` (3,208 lines):**
   - Extract hook: `useTeamManager(user)` (manages invitations, locks, transfers).
   - Extract components:
     - `TeamRosterCard.jsx`: Member list and roles.
     - `TeamInviteDialog.jsx`: Invite creation modal.
     - `LeaderTransferModal.jsx`: Leader re-assignment.
     - `TeamProjectStatusCard.jsx`: Assigned project overview.

3. **Gantt Chart Consolidation (3,355 lines combined):**
   - Unify `AcademicExcelGanttChart.jsx` and `InteractiveGanttChart.jsx`.
   - Extract timeline calculation math into a pure utility: `utils/ganttTimelineEngine.js`.
   - Single configurable view: `components/projects/gantt/GanttChart.jsx` supporting `'compact'` and `'excel'` modes.

---

### 4.3 Database Optimization & Data Consistency Plan

1. **Query Projections & Lean Reads:**
   Enforce `.lean()` on all read-only queries. In Express routes returning JSON, Mongoose document hydration is pure overhead.
   ```javascript
   // Recommended Pattern: Lean with explicit field projection
   const projects = await Project.find({ adviserId, isArchived: false })
     .select('title projectStatus capstonePhase teamId deadlines')
     .populate('teamId', 'name members')
     .lean();
   ```
2. **MongoDB Compound Indexes:**
   Ensure compound indexes match common multi-key filters:
   - `{ academicYear: 1, courseId: 1, sectionId: 1, isArchived: 1 }`
   - `{ titleStatus: 1, isArchived: 1, updatedAt: -1 }` (Already added in Tier 1)
   - `{ adviserId: 1, isArchived: 1, createdAt: -1 }` (Already added in Tier 1)
3. **Transactional Integrity for Multi-Collection Writes:**
   Wrap team join/leave, leader transfer, and project assignment in Mongoose transactions:
   ```javascript
   const session = await mongoose.startSession();
   await session.withTransaction(async () => {
     await Team.updateOne({ _id: teamId }, { $push: { members: userId } }, { session });
     await User.updateOne({ _id: userId }, { teamId }, { session });
   });
   await session.endSession();
   ```

---

### 4.4 Centralized Caching Architecture

1. **Universal Cache Service (`cacheService.js`):**
   - Cache static & reference catalogs:
     - Academic years and terms (TTL: 1 hour)
     - Faculty and adviser directories (TTL: 15 minutes)
     - Milestone deadlines by academic year (TTL: 10 minutes)
   - Dashboard stats (TTL: 30 seconds, auto-invalidated on mutations).
2. **Unify OCR and Extraction Caching:**
   Migrate `extractionCache` and `doiMetadataCache` from `pdfMetadataExtractor.js` into Redis via `cacheService.getOrSet()`.

---

## 5. Strategic Execution Roadmap

```
+─────────────────────────────────────────────────────────────────────────────+
|                               PHASED ROADMAP                                |
+─────────────────────────────────────────────────────────────────────────────+
|  PHASE 1: Performance & Caching Foundation (COMPLETED)                      |
|  - Purged 900 KB logoBase64.js -> 99.2% bundle drop on PPTX export          |
|  - Redis caching for Dashboard statistics (30s TTL + auto-invalidation)     |
|  - Added missing compound indexes in project.model.js                       |
|  - Code-split role sub-dashboards in DashboardPage.jsx via React.lazy()     |
+─────────────────────────────────────────────────────────────────────────────+
|  PHASE 2: Backend Domain Service Decomposition (Next Priority)              |
|  - Decompose project.service.js into 5 sub-services via facade pattern      |
|  - Decompose submission.service.js into 3 sub-services                      |
|  - Extract PDF binary synthesis to pdfGenerator.service.js                  |
|  - Enforce transaction sessions on team/member/project state transitions    |
+─────────────────────────────────────────────────────────────────────────────+
|  PHASE 3: Frontend Component Splitting & State Refactoring                  |
|  - Refactor ActionDoneMatrixTab.jsx into headless hook + sub-components     |
|  - Refactor TeamsPage.jsx into modular components                           |
|  - Consolidate AcademicExcelGanttChart and InteractiveGanttChart            |
|  - Scope global body parser: 2MB default, 50MB only for upload routes       |
+─────────────────────────────────────────────────────────────────────────────+
|  PHASE 4: Infrastructure & Unified Observability                            |
|  - Migrate pdfMetadataExtractor in-memory cache to Redis                    |
|  - Standardize structured logging and health endpoints across Node & Python │
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 6. Architectural Benefits Summary

| Metric | Current State | Projected Post-Refactoring |
|---|---|---|
| **Largest File Size** | 5,581 lines (`project.service.js`) | < 600 lines per sub-service |
| **Largest Component** | 3,208 lines (`TeamsPage.jsx`) | < 300 lines per presentational file |
| **Dashboard Query Latency** | 300ms – 800ms (uncached) | < 10ms (cached) / ~120ms (indexed cold) |
| **Export PPTX Bundle** | 929.39 kB | 7.55 kB (Achieved) |
| **Initial Dashboard Bundle** | 89.63 kB | 39.10 kB (Achieved) |
| **Code Maintainability & Cognitive Load** | Low / High Risk | High / Low Blast Radius |
