# Phase 3 Strategy — Capstone 2 & 3 Workflow, Defense & Advanced Features

> Last updated: 2025-01-XX

---

## Table of Contents

1. [Phase 3 Goal](#1-phase-3-goal)
2. [Prerequisites (Phase 2 Handoff)](#2-prerequisites-phase-2-handoff)
3. [Phase 3 Scope](#3-phase-3-scope)
4. [What Phase 3 Does NOT Include (Deferred to Phase 4)](#4-what-phase-3-does-not-include-deferred-to-phase-4)
5. [Sprint Breakdown](#5-sprint-breakdown)
6. [New Shared Constants](#6-new-shared-constants)
7. [New Database Collections](#7-new-database-collections)
8. [New API Endpoints](#8-new-api-endpoints)
9. [Definition of Done (Phase 3)](#9-definition-of-done-phase-3)
10. [Phase 3 → Phase 4 Handoff Checklist](#10-phase-3--phase-4-handoff-checklist)

---

## 1. Phase 3 Goal

Extend the Capstone Management System beyond Capstone 1 (proposal) into the **Capstone 2 & 3 development/implementation stages**. Phase 3 adds:

- **Project phase progression** — advancing projects from Capstone 1 → 2 → 3
- **Prototype showcasing** — media uploads (images, videos) and external links
- **Defense scheduling & evaluation** — panel defense management with grading rubrics
- **Split-screen document comparison** — side-by-side file viewing for advisers/panelists
- **WebSocket real-time notifications** — upgrade from polling to push-based notifications

At the end of Phase 3, the system supports the **complete Capstone 1–3 lifecycle** — from project creation through development, defense, and evaluation.

---

## 2. Prerequisites (Phase 2 Handoff)

All Phase 2 features are operational:

- ✅ Project creation, title submission, similarity check, approval workflow
- ✅ Chapter uploads (1–3) with S3 storage, MIME validation, versioning
- ✅ Plagiarism checking via async BullMQ jobs
- ✅ Adviser review, annotations, document locking, unlock requests
- ✅ Proposal compilation and approval
- ✅ Late submission handling with mandatory remarks
- ✅ Notification system (in-app + email)
- ✅ Role-based dashboards (Student, Adviser, Panelist, Instructor)
- ✅ 188 integration tests passing
- ✅ Git tagged `v0.6.0` on `main`

---

## 3. Phase 3 Scope

### Included in Phase 3

| Feature | Description | Rule Ref |
| --- | --- | --- |
| **Capstone Phase Advancement** | Instructor advances a project from Capstone 1 → 2 → 3; validates prerequisites (e.g., proposal approved before advancing to Cap 2) | CMS Guidelines §3 |
| **Capstone 2 & 3 Iterative Workflow** | Same chapter upload/review/approval cycle as Cap 1, extended to chapters 4–5; phase-specific deadlines | CMS Guidelines §3 |
| **Prototype Showcasing** | Students upload images, videos, or provide external web links to showcase system prototypes in Cap 2 & 3 | Rule 4, CMS §3 |
| **Defense Scheduling** | Instructor schedules defense sessions (date, time, venue); assigns panel; notifies all parties | CMS Guidelines §4 |
| **Defense Evaluation & Grading** | Panelists submit evaluation scores per rubric criteria; system calculates weighted grades; results visible to students | CMS Guidelines §4 |
| **Split-Screen Document Viewer** | Side-by-side file viewing for comparing two submissions/versions | Rule 4, CMS §5 |
| **WebSocket Real-Time Notifications** | Upgrade from HTTP polling to Socket.IO push; instant notification delivery | Rule 5 |
| **Capstone 2 & 3 Dashboard Updates** | Role-specific dashboards updated with phase progression, prototype gallery, defense schedule | Rule 4 |

---

## 4. What Phase 3 Does NOT Include (Deferred to Phase 4)

| Feature | Deferred To | Reason |
| --- | --- | --- |
| Capstone 4 final defense & archiving | Phase 4 | End-of-lifecycle; requires Cap 1–3 to be stable |
| Dual version upload (Academic + Journal) | Phase 4 | Final submission feature |
| Archive search with year/topic/keyword | Phase 4 | Requires archived projects to exist |
| Certificate generation | Phase 4 | Post-final-defense feature |
| Bulk upload by Instructor (legacy docs) | Phase 4 | Archive feature |
| Instructor reporting (by author, title, year) | Phase 4 | Requires aggregated data |
| Google Docs API integration | Phase 4+ | Deferred for complexity management |
| OCR for scanned PDFs | Phase 4+ | Enhancement for plagiarism accuracy |

---

## 5. Sprint Breakdown

---

### Sprint 10: Capstone Phase Advancement & Prototype Showcasing

**Goal:** Projects can advance through Capstone phases 1 → 2 → 3. Students can upload prototype media (images, videos) and share external links to showcase their work during development phases.

**Duration:** 2 weeks

#### Backend Tasks

| ID | Task | Priority |
| --- | --- | --- |
| S10-01 | Add `advancePhase` method to **ProjectService** — validates prerequisites per phase transition (Cap 1→2: proposal must be approved; Cap 2→3: all Cap 2 submissions approved); increments `capstonePhase`; transitions project status; notifies team | Critical |
| S10-02 | Add `POST /:id/advance-phase` route — Instructor only; calls `advancePhase` | Critical |
| S10-03 | Create **Prototype** embedded schema in Project model — `{ title, description, type (image/video/link), storageKey, url, uploadedBy, createdAt }` | Critical |
| S10-04 | Add `addPrototype` method to **ProjectService** — S3 upload for images/videos, URL validation for links; enforce max 20 prototypes per project; MIME validation for image/video files | Critical |
| S10-05 | Add `removePrototype` method to **ProjectService** — delete from S3 + remove from project | High |
| S10-06 | Add `POST /:id/prototypes` route — Student (team members); multipart/form-data for media uploads OR JSON for link prototypes | Critical |
| S10-07 | Add `DELETE /:id/prototypes/:prototypeId` route — Student (uploader) or Instructor | High |
| S10-08 | Add `GET /:id/prototypes` route — any authenticated user with project access | High |
| S10-09 | Extend deadline schema to support Capstone 2 & 3 deadlines: `chapter4`, `chapter5`, `defense`, `finalSubmission` | High |
| S10-10 | Add Zod validation schemas for `advancePhase`, `addPrototype`, `removePrototype` | High |
| S10-11 | Add `PROTOTYPE_TYPES` and `CAPSTONE_PHASES` to `@cms/shared` constants | High |
| S10-12 | Trigger notifications: phase advanced (→ team + adviser), prototype added (→ adviser) | Medium |
| S10-13 | Write integration tests: phase advancement (happy path, missing prerequisites, already at max phase, RBAC), prototype CRUD (upload image, upload video, add link, delete, max limit, MIME validation) | Critical |

#### Frontend Tasks

| ID | Task | Priority |
| --- | --- | --- |
| S10-14 | Add **projectService** methods: `advancePhase`, `addPrototype`, `removePrototype`, `getPrototypes` | Critical |
| S10-15 | Add React Query hooks: `useAdvancePhase`, `useAddPrototype`, `useRemovePrototype` | Critical |
| S10-16 | Build **PrototypeGallery** component — grid of image/video/link cards with preview, lightbox for images, embedded video player, external link opener | Critical |
| S10-17 | Build **PrototypeUploadForm** component — drag-and-drop for images/videos + URL input for links; title & description fields | Critical |
| S10-18 | Add "Advance Phase" button to **ProjectDetailPage** (Instructor view) — with confirmation dialog and prerequisite validation feedback | High |
| S10-19 | Update **WorkflowPhaseTracker** to highlight current capstone phase and show phase-specific status | High |
| S10-20 | Update **MyProjectPage** to show prototype gallery and upload form when in Capstone 2 or 3 | High |
| S10-21 | Add new shadcn/ui components if needed: `AspectRatio`, `Lightbox` (or use a library) | Medium |

#### Documentation

| ID | Task | Priority |
| --- | --- | --- |
| S10-22 | Update `API.md` with phase advancement and prototype endpoints | High |
| S10-23 | Update `DATABASE.md` with prototype schema and extended deadlines | High |
| S10-24 | Update `CHANGELOG.md` | High |
| S10-25 | Create `SPRINT_10_PLAN.md` | Medium |

#### Sprint 10 Definition of Done

- [ ] Instructor can advance a project from Cap 1 → 2 → 3 with prerequisite checks
- [ ] Students can upload images and videos for prototype showcasing
- [ ] Students can add external web links as prototype references
- [ ] Prototypes are stored in S3 with proper key naming
- [ ] Prototype gallery displays media with previews and lightbox
- [ ] Deadline schema supports Capstone 2 & 3 phase deadlines
- [ ] Notifications fire for phase advancement and prototype uploads
- [ ] All integration tests pass (existing 188 + new Sprint 10 tests)
- [ ] Documentation updated

---

### Sprint 11: Defense Scheduling & Evaluation

**Goal:** Instructors can schedule panel defenses. Panelists evaluate presentations using configurable rubrics. Grades are computed and made visible to students.

**Duration:** 2 weeks

#### Backend Tasks

| ID | Task | Priority |
| --- | --- | --- |
| S11-01 | Create **Defense** model (`/server/modules/defenses/defense.model.js`) — projectId, scheduledDate, startTime, endTime, venue, capstonePhase, status (scheduled/in_progress/completed/cancelled), evaluators (panelist refs), remarks | Critical |
| S11-02 | Create **EvaluationRubric** embedded schema — criteria[{ name, description, maxScore, weight }]; stored as template on Defense | Critical |
| S11-03 | Create **Evaluation** model (`/server/modules/defenses/evaluation.model.js`) — defenseId, evaluatorId, scores[{ criterionName, score, comment }], totalScore, submittedAt | Critical |
| S11-04 | Create **DefenseService** with methods: `scheduleDefense`, `updateDefense`, `cancelDefense`, `getDefense`, `listDefenses`, `startDefense`, `completeDefense` | Critical |
| S11-05 | Create **EvaluationService** with methods: `submitEvaluation`, `getEvaluations`, `computeFinalGrade`, `getDefenseResults` | Critical |
| S11-06 | Create defense routes: full CRUD + status transitions + evaluation submission | Critical |
| S11-07 | Implement **grade computation** — weighted average of all panelist scores per criterion | High |
| S11-08 | Add Zod validation schemas for all defense and evaluation endpoints | High |
| S11-09 | Add `DEFENSE_STATUSES` to `@cms/shared` constants | High |
| S11-10 | Trigger notifications: defense scheduled (→ team + panelists), defense results available (→ team + adviser) | High |
| S11-11 | Write integration tests: defense CRUD, evaluation submission, grade computation, RBAC | Critical |

#### Frontend Tasks

| ID | Task | Priority |
| --- | --- | --- |
| S11-12 | Add **defenseService** with all API methods | Critical |
| S11-13 | Add React Query hooks: `useDefenses`, `useScheduleDefense`, `useSubmitEvaluation`, `useDefenseResults` | Critical |
| S11-14 | Build **DefenseSchedulePage** — date picker, time slots, venue, evaluator selection; Instructor-only | Critical |
| S11-15 | Build **DefenseListPage** — schedule view with status badges; calendar or list view toggle | High |
| S11-16 | Build **EvaluationForm** — rubric-based scoring per criterion with comments; Panelist-only | Critical |
| S11-17 | Build **DefenseResultsPage** — displays scores per panelist, weighted total, feedback; Student view | High |
| S11-18 | Update dashboards with upcoming defense information and evaluation status | High |

#### Documentation

| ID | Task | Priority |
| --- | --- | --- |
| S11-19 | Update `API.md` with defense and evaluation endpoints | High |
| S11-20 | Update `DATABASE.md` with Defense and Evaluation schemas | High |
| S11-21 | Update `CHANGELOG.md` | High |

---

### Sprint 12: Split-Screen Viewer & WebSocket Notifications

**Goal:** Advisers/panelists can compare two documents side-by-side. Notifications are delivered in real-time via WebSockets.

**Duration:** 1.5 weeks

#### Backend Tasks

| ID | Task | Priority |
| --- | --- | --- |
| S12-01 | Install and configure **Socket.IO** on Express server | Critical |
| S12-02 | Create **SocketService** (`/server/services/socket.service.js`) — manages connections, rooms (per user), auth via JWT | Critical |
| S12-03 | Integrate SocketService with NotificationService — emit events on notification creation | Critical |
| S12-04 | Add `GET /:submissionId1/compare/:submissionId2` endpoint — returns two signed URLs for side-by-side viewing with authorization checks | High |
| S12-05 | Write integration tests for WebSocket auth and notification delivery | High |

#### Frontend Tasks

| ID | Task | Priority |
| --- | --- | --- |
| S12-06 | Install `socket.io-client`; create **useSocket** hook for connection management | Critical |
| S12-07 | Update notification system to listen for WebSocket events instead of polling | Critical |
| S12-08 | Build **SplitScreenViewer** component — two PDF viewers side-by-side with independent scroll, zoom controls, version selector dropdowns | Critical |
| S12-09 | Add split-screen entry points: compare versions of same chapter, compare two different chapters | High |
| S12-10 | Handle WebSocket reconnection, fallback to polling on failure | High |

#### Documentation

| ID | Task | Priority |
| --- | --- | --- |
| S12-11 | Update `ARCHITECTURE.md` with WebSocket architecture | High |
| S12-12 | Update `CHANGELOG.md` | High |

---

### Sprint 13: Phase 3 Integration Testing & Polish

**Goal:** End-to-end testing of the complete Capstone 1–3 lifecycle. Dark mode compliance, accessibility, and performance optimization for all Phase 3 features.

**Duration:** 1.5 weeks

#### Tasks

| ID | Task | Priority |
| --- | --- | --- |
| S13-01 | Write end-to-end integration tests for full Cap 1 → 2 → 3 lifecycle | Critical |
| S13-02 | Dark mode audit for all Phase 3 pages (prototype gallery, defense views, evaluation forms, split-screen) | High |
| S13-03 | Accessibility audit — ARIA labels, keyboard navigation, color contrast | High |
| S13-04 | Performance: lazy-load PDF viewer, split-screen, and evaluation components | Medium |
| S13-05 | Error states and empty states for all new pages | High |
| S13-06 | Run `npm audit` and fix vulnerabilities | Medium |
| S13-07 | Final documentation review and update | High |
| S13-08 | Git tag `v0.9.0`, push to main | Critical |

---

## 6. New Shared Constants

```javascript
// shared/constants/prototypeTypes.js
export const PROTOTYPE_TYPES = { IMAGE: 'image', VIDEO: 'video', LINK: 'link' };

// shared/constants/defenseStatuses.js
export const DEFENSE_STATUSES = {
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// shared/constants/capstonePhases.js
export const CAPSTONE_PHASES = { PHASE_1: 1, PHASE_2: 2, PHASE_3: 3, PHASE_4: 4 };
```

---

## 7. New Database Collections

### Defenses

```
defenseId, projectId, scheduledDate, startTime, endTime, venue,
capstonePhase, status, evaluatorIds[], rubric{ criteria[] },
remarks, createdBy, timestamps
```

### Evaluations

```
evaluationId, defenseId, evaluatorId, scores[{ criterionName, score, comment }],
totalScore, submittedAt, timestamps
```

### Project Model Extensions

```
prototypes[{ title, description, type, storageKey, url, uploadedBy, createdAt }]
Extended deadlines: chapter4, chapter5, defense, finalSubmission
```

---

## 8. New API Endpoints (Phase 3)

| Method | Path | Description | Auth |
| --- | --- | --- | --- |
| POST | `/api/projects/:id/advance-phase` | Advance capstone phase | Instructor |
| POST | `/api/projects/:id/prototypes` | Add prototype | Student |
| GET | `/api/projects/:id/prototypes` | List prototypes | Any with access |
| DELETE | `/api/projects/:id/prototypes/:protoId` | Remove prototype | Student/Instructor |
| POST | `/api/defenses` | Schedule defense | Instructor |
| GET | `/api/defenses` | List defenses (filtered) | Faculty |
| GET | `/api/defenses/:id` | Get defense detail | Any with access |
| PATCH | `/api/defenses/:id` | Update defense | Instructor |
| POST | `/api/defenses/:id/start` | Start defense | Instructor |
| POST | `/api/defenses/:id/complete` | Complete defense | Instructor |
| DELETE | `/api/defenses/:id` | Cancel defense | Instructor |
| POST | `/api/defenses/:id/evaluate` | Submit evaluation | Panelist |
| GET | `/api/defenses/:id/evaluations` | Get evaluations | Faculty/Student |
| GET | `/api/defenses/:id/results` | Get computed results | Any with access |
| GET | `/api/submissions/:id/compare/:id2` | Get comparison URLs | Faculty |

---

## 9. Definition of Done (Phase 3)

Phase 3 is complete when **all** of the following are true:

- [ ] Projects can advance from Capstone 1 → 2 → 3 with prerequisite validation
- [ ] Prototype showcasing works: image/video uploads + external links
- [ ] Defenses can be scheduled, evaluated, and graded
- [ ] Split-screen document comparison viewer is operational
- [ ] WebSocket notifications deliver in real-time
- [ ] All role-based dashboards updated for Capstone 2 & 3 context
- [ ] Dark/light mode compliant for all Phase 3 pages
- [ ] All integration tests pass
- [ ] Documentation current for Phase 3 scope
- [ ] npm audit clean
- [ ] Git tagged on `main`

---

## 10. Phase 3 → Phase 4 Handoff Checklist

Before starting Phase 4, confirm:

- [ ] All Phase 3 Definition of Done items are met
- [ ] Phase 4 backlog is written (Capstone 4: final defense, archiving, dual version, certificates, reporting)
- [ ] WebSocket infrastructure is stable
- [ ] Defense evaluation workflow is proven end-to-end
- [ ] All Capstone 1–3 workflow edge cases are tested
- [ ] The team has reviewed `.instructions.md` rules for Phase 4 scope

---

## Summary

Phase 3 extends the CMS into a **complete Capstone 1–3 management system** with:

- **4 sprints** (Sprint 10–13) across approximately 7–8 weeks
- **2 new database collections** (defenses, evaluations)
- **~15 new API endpoints** across projects, defenses, evaluations, and comparison
- **1 new server module** (defenses with evaluations)
- **1 new integration** (Socket.IO for real-time notifications)
- **5+ new frontend pages** covering prototypes, defenses, evaluations, split-screen

### Phase 3 Sprint Summary

| Sprint | Duration | Focus | Key Deliverables |
| --- | --- | --- | --- |
| **Sprint 10** | 2 weeks | Phase Progression & Prototypes | Phase advancement, prototype uploads, extended deadlines |
| **Sprint 11** | 2 weeks | Defense & Evaluation | Defense scheduling, rubric grading, evaluation forms |
| **Sprint 12** | 1.5 weeks | Advanced UI | Split-screen viewer, WebSocket notifications |
| **Sprint 13** | 1.5 weeks | Polish & Testing | E2E lifecycle tests, dark mode, accessibility, v0.9.0 tag |

### New Dependencies (npm packages to add)

| Package | Purpose | Install Location |
| --- | --- | --- |
| `socket.io` | WebSocket server | server |
| `socket.io-client` | WebSocket client | client |
