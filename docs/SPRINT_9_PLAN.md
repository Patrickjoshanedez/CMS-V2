# Sprint 9 — Proposal Compilation, Frontend Pages & Integration Testing

> Last updated: 2025-01-20
> Target version: **v0.6.0** (Phase 2 finale)

---

## Sprint Goal

Close out Phase 2 by implementing the proposal compilation workflow, polishing all
frontend pages, writing comprehensive integration tests, and preparing full documentation.

---

## Prerequisites (from Sprint 8 — v0.5.0)

- [x] Plagiarism checker — async BullMQ queue + sync fallback ✅
- [x] 171 tests passing ✅
- [x] All chapter submission/review/lock/unlock workflows working ✅
- [x] All models, services, and routes for projects & submissions complete ✅

---

## Task Breakdown

### Backend (S9-01 → S9-09)

| ID | Task | Priority |
|------|------|----------|
| S9-01 | **Proposal compilation endpoint** `POST /api/projects/:id/compile-proposal` — Validate all Ch.1-3 approved & locked, accept unified proposal upload, create submission with `type: proposal` | High |
| S9-02 | **Proposal approval workflow** — Adviser/Instructor review proposal → if approved, set `projectStatus: proposal_approved`; transitions mirror chapter review | High |
| S9-03 | **E2E integration tests** — Full Capstone 1 lifecycle: create project → title submit → title approve → upload Ch.1-3 → plagiarism → review/approve → compile proposal → approve proposal | High |
| S9-04 | **RBAC integration tests** — Student accessing other team's project (403), adviser accessing unassigned team (403), panelist doing adviser actions (403) | High |
| S9-05 | **Document lock tests** — Upload to locked chapter (400), unlock request → approve → re-upload | High |
| S9-06 | **Deadline tests** — Upload past deadline without remarks (400), with remarks (success, isLate=true) | High |
| S9-07 | **File validation tests** — Upload disguised EXE (400), oversized file (400), valid PDF (200) | High |
| S9-08 | `npm audit` — resolve high/critical vulnerabilities | Medium |
| S9-09 | **Performance audit** — verify indexes on all collections, analyze query plans | Medium |

### Frontend (S9-10 → S9-17)

| ID | Task | Priority |
|------|------|----------|
| S9-10 | **Proposal Compilation Page** — shows approved chapters, "Compile Proposal" button, upload flow | High |
| S9-11 | **Instructor: All Projects Overview** — table/grid of all projects, filters by status/year/search | High |
| S9-12 | **Panelist: My Groups page** — list projects the panelist is assigned to | High |
| S9-13 | Polish all Phase 2 pages — loading skeletons, empty states, error boundaries | Medium |
| S9-14 | Dark/light mode visual audit all pages | Medium |
| S9-15 | **WorkflowPhaseTracker** stepper component — visual timeline of capstone phases | Medium |
| S9-16 | Build **403 Forbidden** page | Medium |
| S9-17 | Toast notifications via shadcn/ui Sonner for all mutations | Medium |

### Documentation (S9-18 → S9-24)

| ID | Task | Priority |
|------|------|----------|
| S9-18 | Finalize `API.md` with all Phase 2 endpoints | Medium |
| S9-19 | Finalize `DATABASE.md` with all schemas & indexes | Medium |
| S9-20 | Update `ARCHITECTURE.md` with plagiarism/queue architecture | Medium |
| S9-21 | Create/update `DEPLOYMENT.md` | Low |
| S9-22 | Update `CHANGELOG.md` for v0.5.0 → v0.6.0 | Medium |
| S9-23 | Create Phase 3 backlog | Low |
| S9-24 | Code freeze & tag v0.6.0 | High |

---

## Implementation Order

1. Backend: S9-01 → S9-02 (proposal compilation + approval)
2. Tests: S9-03 → S9-07 (all integration tests)
3. Frontend: S9-16 → S9-17 → S9-15 → S9-10 → S9-11 → S9-12 → S9-13 → S9-14
4. Audits: S9-08 → S9-09
5. Docs: S9-18 → S9-23
6. Release: S9-24

---

## Definition of Done

- [ ] Proposal compile + approve workflow works end-to-end
- [ ] All integration tests pass (target: 200+ tests)
- [ ] All frontend pages handle loading, empty, and error states
- [ ] Dark/light mode renders correctly on all pages
- [ ] API.md, DATABASE.md, CHANGELOG.md fully updated
- [ ] `npm audit` shows zero high/critical vulnerabilities
- [ ] Code freeze, tagged v0.6.0, pushed to GitHub
