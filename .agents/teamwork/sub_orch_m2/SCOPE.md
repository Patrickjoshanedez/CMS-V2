# Scope: Milestone 2 — UI Sizing, Spacing & Cognitive Ergonomics Overhaul

## Architecture
- **Design System Tokens**: Tailwind CSS variable tokens (`bg-background`, `text-foreground`, `border-border/60`). Hardcoded hex colors and arbitrary literal dark classes are banned.
- **Layout Shell Continuity**: Canonical layout width is `max-w-7xl` (`DashboardLayout.jsx`). Clamped viewers (`max-w-5xl`) and oversized dialogs (`max-w-6xl`) must be aligned with responsive constraints (`w-full max-w-full`, `max-w-4xl`).
- **Touch Ergonomics**: WCAG 2.1 AA Target Size minimum 44x44px for touch interactions on mobile (<640px) via `min-h-[44px] min-w-[44px]`, scaling down smoothly for desktop viewports (`sm:min-h-0 sm:min-w-0 sm:h-8`).
- **Cognitive Ergonomics**: Cowan (2001) working memory limit (3–4 chunk heuristic) enforced via semantic `<fieldset>` and `<legend>` groupings on all forms exceeding 4 inputs.
- **Table Responsiveness**: Strict horizontal overflow containment via outer `overflow-x-auto` wrappers to protect mobile viewports (390x844).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 7 | Mobile Touch Target Normalization | Enforce min 44x44px touch targets on mobile viewports (`min-h-[44px] sm:min-h-0 sm:h-8`) across `ActionDoneMatrixTab.jsx`, `PrototypeGalleryModal.jsx`, `ManuscriptTemplateWidget.jsx`, `TeamFormationNotificationItem.jsx`, and `SubmissionReviewPage.jsx` | M2 | Survey 1 |
| 8 | Layout Width Shell Continuity | Remove hardcoded `max-w-5xl` clamping in `CanonicalDocumentViewer.jsx` and optimize oversized `max-w-6xl` containers to align with `DashboardLayout` `max-w-7xl` | M2 | Survey 1 |
| 9 | Heading Hierarchy Correction | Demote duplicate `<h1>` in `CanonicalDocumentViewer.jsx:1275` to semantic `<h2>` | M2 | Survey 1 |
| 10 | Form Chunking (Cowan 4-Chunking) | Refactor dense forms (>5 inputs) with semantic `<fieldset>` and `<legend>` across `UsersPage.jsx`, `ExistingCapstoneUploadPage.jsx`, `ProfilePage.jsx`, `ScheduleDefenseModal.jsx`, and `MilestoneDeadlinesModal.jsx` | M2 | Survey 1 |
| 11 | Responsive Table Overflow Wrappers | Add horizontal overflow wrappers (`overflow-x-auto`) to scoring tables in `EvaluationPanel.jsx`, diff tables in `VersionCompare.jsx`, and `SecretaryMinutesDocumentSheet.jsx` | M2 | Survey 1 |

## Milestones / Iteration Target
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M2.1 | Mobile Touch Target Normalization | Feature 7 | none | PLANNED |
| M2.2 | Layout Width Shell & Heading Hierarchy | Features 8, 9 | none | PLANNED |
| M2.3 | Form Chunking (Cowan 4-Chunking) | Feature 10 | none | PLANNED |
| M2.4 | Responsive Table Overflow Wrappers | Feature 11 | none | PLANNED |

## Interface Contracts
### UI Sizing & Ergonomics Contract (M2)
- Mobile touch target floor: `min-h-[44px] min-w-[44px]` for interactive controls on viewport width < 640px; desktop compactness preserved with `sm:min-h-0 sm:min-w-0 sm:h-8`.
- Shell max-width: Standardized to `max-w-7xl` matching `DashboardLayout.jsx`.
- Form chunking: Forms with >4 inputs grouped into `<fieldset className="space-y-4 rounded-lg border border-border/60 p-4">` with `<legend className="text-sm font-semibold text-foreground px-2">`.
- Responsive tables: Data tables and diffs wrapped in `<div className="overflow-x-auto">`.
- Heading hierarchy: Single `<h1>` per view, drawers and subcomponents use semantic `<h2>` / `<h3>`.

## Exclusive File Boundaries
- `client/src/components/archive/CanonicalDocumentViewer.jsx`
- `client/src/components/submissions/VersionHistory.jsx`
- `client/src/pages/UsersPage.jsx` or `client/src/pages/users/UsersPage.jsx`
- `client/src/pages/projects/ExistingCapstoneUploadPage.jsx`
- `client/src/pages/ProfilePage.jsx` or `client/src/pages/profile/ProfilePage.jsx`
- `client/src/components/projects/PrototypeGalleryModal.jsx`
- `client/src/components/projects/ManuscriptTemplateWidget.jsx` or `client/src/components/teams/ManuscriptTemplateWidget.jsx`
- `client/src/components/notifications/TeamFormationNotificationItem.jsx` or `client/src/components/teams/TeamFormationNotificationItem.jsx`
- `client/src/pages/submissions/SubmissionReviewPage.jsx`
- `client/src/components/defense/ScheduleDefenseModal.jsx`
- `client/src/components/projects/MilestoneDeadlinesModal.jsx` or `client/src/components/instructor/MilestoneDeadlinesModal.jsx`
- `client/src/components/archive/PlagiarismReport.jsx` or `client/src/components/submissions/PlagiarismReport.jsx`
- `client/src/components/submissions/VersionCompare.jsx`
- `client/src/components/projects/EvaluationPanel.jsx`
- `client/src/components/submissions/EvaluationWorkspace.jsx`
- `client/src/components/secretary/SecretaryMinutesDocumentSheet.jsx`
