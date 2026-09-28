# Project: BukSU Capstone Management System V2 (CMS-V2) System-Wide Remediation

## Architecture
- **Frontend SPA**: React 18, Vite, Tailwind CSS, Zustand Store, TanStack React Query (`client/src/`).
- **Design Tokens**: Institutional BukSU Gold (`#F5C253`) and BukSU Navy Blue (`#1A448A`), Tailwind semantic CSS variables (`bg-background`, `text-foreground`, `border-border/60`).
- **Document Viewing**: Canonical `SophisticatedDocumentViewer.jsx` format supporting both embedded inline (`embedded={true}`) and modal dialog presentations (`open={true}`), full OOXML and PDF streaming.
- **Accessibility Standards**: WCAG 2.1 AA/AAA compliance: minimum 44x44px interactive touch targets (`min-h-[44px] min-w-[44px]`), accessible names (`aria-label`), state announcements (`aria-expanded`, `aria-busy`, `role="status"`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Prune PaginatedDocumentViewer | Delete obsolete `PaginatedDocumentViewer.jsx` and its test `PaginatedDocumentViewer.test.jsx` | M1 | Survey 1 |
| 2 | Prune ReadonlyPDFViewer | Delete obsolete `ReadonlyPDFViewer.jsx` | M1 | Survey 1 |
| 3 | Clean Test Mocks | Remove dead mocks in `PlagiarismReportPage.test.jsx:37-39` and `ProjectDetailPage.back-nav.test.jsx:81` | M1 | Survey 1 |
| 4 | Canonical Viewer Validation | Verify `SophisticatedDocumentViewer.jsx` is the sole document viewer and satisfies the unified contract | M1 | Survey 1 |
| 5 | Clean Auth Inline Color Styles | Remove 11 redundant inline `style={{ color }}` tags in `BukSULoginSidePanel.jsx` | M1 | Survey 1 |
| 6 | GoogleScholarSidebar Touch Targets | Normalize touch targets >= 44x44px for reset button, preset dates, year inputs, and apply button | M2 | Survey 1 |
| 7 | GoogleScholar Mobile Drawer Dismiss | Normalize touch target >= 44x44px for mobile filter slide-out close button | M2 | Survey 1 |
| 8 | PrototypeGallery Controls | Normalize touch targets >= 44x44px for delete button, modal close button, and mode toggle buttons | M2 | Survey 1 |
| 9 | PrototypeGallery Touch Visibility | Ensure prototype card delete button is visible on touch screens (`opacity-100 sm:opacity-0 sm:group-hover:opacity-100`) | M2 | Survey 1 |
| 10 | TeamCommitteeAssignments Touch Targets | Normalize touch targets >= 44x44px for Clear Adviser, Clear Secretary, and Remove Panelist buttons | M2 | Survey 1 |
| 11 | TeamCommittee Accordion Touch Target | Normalize touch target >= 44x44px for Milestones & Deadlines Accordion Chevron Trigger | M2 | Survey 1 |
| 12 | Accordion Accessible Semantics | Add `aria-label`, dynamic `aria-expanded`, and `aria-controls` to Deadlines Accordion Chevron in `TeamCommitteeAssignmentsView.jsx` | M3 | Survey 2 |
| 13 | Committee Icon Buttons Accessible Names | Add explicit `aria-label` to Clear Adviser, Clear Secretary, and Remove Panelist buttons in `TeamCommitteeAssignmentsView.jsx` | M3 | Survey 2 |
| 14 | Optimizer Live Status Announcements | Add `aria-busy={loading}` and live region announcements (`role="status"`, `aria-live="polite"`) in `OptimizationEngine.jsx` | M3 | Survey 2 |
| 15 | Administrative Route Redirects | Implement client-side `<Route>` redirects in `App.jsx` for `/committee` -> `/committee-assignments` and `/scheduling` -> `/scheduling-center` | M3 | Survey 2 |
| 16 | BukSULoginSidePanel Typography De-Slop | Remove gradient heading `bg-gradient-to-r from-[#F5C253] via-[#E5A823] to-[#C68A1B]` and replace with solid BukSU Gold `text-[#F5C253] font-bold` | M4 | Survey 2 |
| 17 | LandingPage Typography De-Slop | Remove multi-stop gradient heading fill `bg-gradient-to-r from-[#1A448A] to-[#2563EB]...` and replace with solid BukSU Blue / Gold `text-[#1A448A] dark:text-[#F5C253]` | M4 | Survey 2 |
| 18 | ProjectCohortCard Border De-Slop | Replace asymmetric `border-l-4 border-l-amber-500` with balanced border `border-amber-500/40 dark:border-amber-400/40` and an indicator pill | M4 | Survey 2 |
| 19 | DefenseSchedulingPage Border De-Slop | Replace asymmetric `border-l-4 border-l-blue-600` on calendar cards with balanced border `border border-blue-500/40 dark:border-blue-400/40` | M4 | Survey 2 |
| 20 | ProjectCohortCard Test Suite Fix | Add `QueryClientProvider` wrapper in `ProjectCohortCard.test.jsx` so `usePrefetchProject` passes without error | M4 | Survey 2/3 |
| 21 | Google OAuth Locale Enforcement | Enforce `locale="en"` / `hl="en"` on `<GoogleOAuthProvider>` in `client/src/main.jsx` and `<LoginPage>` | M4 | Survey 2 |
| 22 | InstructorDashboard Progressive Skeletons | Decouple monolithic `PageSkeleton` into widget-level loading skeletons (`KPICardsSkeleton`, `WorkloadHeatmapSkeleton`, header shimmers) | M5 | Survey 3 |
| 23 | Milestone Progression Timeline | Convert static 2x2 grid in `BukSULoginSidePanel.jsx` into sequential 5-step vertical connected milestone progression timeline | M5 | Survey 3 |
| 24 | Final Quality Battery Verification | Full client test suite, API route parity, agentic governance audit, and Playwright visual verification | M6 | Survey 3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Document Viewer Consolidation & Dead Code Pruning | Features 1, 2, 3, 4, 5 | none | PLANNED |
| M2 | Mobile Ergonomics & Touch Target Normalization | Features 6, 7, 8, 9, 10, 11 | M1 | PLANNED |
| M3 | Accessible Semantics & Administrative Route Hardening | Features 12, 13, 14, 15 | M2 | PLANNED |
| M4 | Institutional Typography & Anti-Patterns De-Slop Pass | Features 16, 17, 18, 19, 20, 21 | M3 | PLANNED |
| M5 | Progressive Widget Loading & Layout Architecture | Features 22, 23 | M4 | PLANNED |
| M6 | Final Verification & Quality Gate Battery | Feature 24 | M5 | PLANNED |

## Interface Contracts
### Document Viewer Contract
- Canonical viewer: `SophisticatedDocumentViewer.jsx`
- Props: `fileBlob`, `fileUrl`, `fileName`, `chapterTitle`, `embedded`, `open`, `onOpenChange`, `isPlagiarismReport`, etc.
- No references to `PaginatedDocumentViewer` or `ReadonlyPDFViewer`.

### Touch Target Normalization Contract
- Minimum bounding box for interactive elements on mobile/touch: 44px x 44px (`min-h-[44px] min-w-[44px]`).
- Desktop compactness preserved via responsive breakpoints (`sm:min-h-0 sm:min-w-0 sm:h-7 sm:w-7` or equivalent).

### Accessibility & Route Semantics Contract
- Accordion trigger must have `aria-label`, `aria-expanded={boolean}`, `aria-controls={id}`.
- Icon-only buttons must have descriptive `aria-label`.
- Workload optimizer must announce calculation status with `role="status"`, `aria-live="polite"`, `aria-busy={boolean}`.
- Routes `/committee` and `/scheduling` must redirect via `<Navigate replace />` to `/committee-assignments` and `/scheduling-center`.

### Institutional Visual Design & Typography Contract
- Zero gradient text (`bg-clip-text`) on headings and metrics.
- Zero asymmetric `border-l-4` card accents.
- Google Identity Services configured with `locale="en"`.
- BukSU milestone timeline displays all 5 canonical phases (Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4).

## Code Layout
- `client/src/components/documents/` — Canonical document viewers
- `client/src/components/auth/` — Login side panel, auth widgets
- `client/src/components/archive/` — Google scholar sidebar
- `client/src/components/projects/` — Prototype gallery, project cohort card
- `client/src/components/users/` — Team committee assignments view
- `client/src/components/dashboards/` — Instructor dashboard, optimization engine
- `client/src/pages/` — Page components (`LoginPage.jsx`, `LandingPage.jsx`, `DefenseSchedulingPage.jsx`)
- `client/src/App.jsx` & `client/src/main.jsx` — Core routing and providers
