# Sprint 10 Plan — Capstone Phase Advancement & Prototype Showcasing

> Last updated: 2025-01-XX
> Phase: 3 | Sprint: 10 | Target Version: v0.7.0

---

## Sprint Goal

Enable projects to advance through Capstone phases 1 → 2 → 3 with prerequisite validation. Allow students to showcase system prototypes by uploading images, videos, or providing external web links during Capstone 2 & 3.

---

## Task Breakdown

### Backend

| ID | Task | Status |
|----|------|--------|
| S10-01 | Add `PROTOTYPE_TYPES`, `PROTOTYPE_TYPE_VALUES`, `CAPSTONE_PHASES` to `@cms/shared` | |
| S10-02 | Add `phase_advanced` and `prototype_added` to notification types | |
| S10-03 | Add `prototypeSchema` and `prototypes` array to Project model | |
| S10-04 | Extend deadline schema with `chapter4`, `chapter5`, `defense` fields | |
| S10-05 | Add `buildPrototypeKey` to StorageService | |
| S10-06 | Add `ALLOWED_PROTOTYPE_MIME_TYPES` and `validatePrototypeFile` middleware | |
| S10-07 | Implement `advancePhase` in ProjectService | |
| S10-08 | Implement `addPrototype` in ProjectService (S3 upload for media / URL for links) | |
| S10-09 | Implement `removePrototype` in ProjectService (S3 delete + array removal) | |
| S10-10 | Implement `getPrototypes` in ProjectService | |
| S10-11 | Add Zod schemas: `advancePhaseSchema`, `addPrototypeLinkSchema` | |
| S10-12 | Add controller methods and route bindings | |
| S10-13 | Write integration tests | |

### Frontend

| ID | Task | Status |
|----|------|--------|
| S10-14 | Add project service methods for phase/prototype APIs | |
| S10-15 | Add React Query hooks | |
| S10-16 | Build PrototypeGallery component | |
| S10-17 | Build PrototypeUploadForm component | |
| S10-18 | Add "Advance Phase" button to ProjectDetailPage | |
| S10-19 | Update WorkflowPhaseTracker for multi-phase | |
| S10-20 | Update routes and navigation | |

### Documentation

| ID | Task | Status |
|----|------|--------|
| S10-21 | Update API.md, DATABASE.md, CHANGELOG.md, ARCHITECTURE.md | |

---

## Definition of Done

- [ ] Instructor can advance a project from Cap 1 → 2 → 3 with prerequisite checks
- [ ] Students can upload images and videos as prototypes
- [ ] Students can add external web links as prototypes
- [ ] Prototypes stored in S3 with proper key naming
- [ ] Max 20 prototypes per project enforced
- [ ] MIME validation for image/video files
- [ ] Notifications fire for phase advancement and prototype uploads
- [ ] Extended deadlines support Capstone 2 & 3 phases
- [ ] All integration tests pass
- [ ] Documentation updated
