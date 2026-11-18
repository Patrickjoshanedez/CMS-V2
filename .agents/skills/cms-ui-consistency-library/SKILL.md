---
name: cms-ui-consistency-library
version: 1.0.0
schema-version: 1
description: >
  Canonical UI Consistency & Modern Web Guidance Skill Library for BukSU CMS-V2.
  Trigger on: "ui consistency", "rework ui", "layout primitives", "page header",
  "stat card", "metric grid", "role consistency", "modern-web-guidance", "design library",
  "cross-role ui", or before modifying any page under client/src/pages/.
---

# CMS-V2 UI Consistency Library

Single source of truth combining shared React layout primitives, semantic dark/light tokens, role-to-route mappings, and `modern-web-guidance` platform rules so agents can modify any role view without context degradation or visual drift.

## Library Index (Progressive Disclosure)

Read **only** the slice needed for your task:

| File | Format | Purpose | When to Load |
| :--- | :--- | :--- | :--- |
| [library.json](file:///c:/Users/patri/dev/CMS-V2/.agents/skills/cms-ui-consistency-library/library.json) | JSON | Master manifest of shared primitives, exact prop signatures, CSS tokens, and breakpoints | Always check first when adding/refactoring a page |
| [role-page-matrix.json](file:///c:/Users/patri/dev/CMS-V2/.agents/skills/cms-ui-consistency-library/role-page-matrix.json) | JSON | Complete inventory of Student, Instructor, Faculty, and shared pages with role visibility and required primitives | When auditing cross-role coverage or onboarding a new route |
| [mwg-rules.json](file:///c:/Users/patri/dev/CMS-V2/.agents/skills/cms-ui-consistency-library/mwg-rules.json) | JSON | Distilled `modern-web-guidance` rules (`improve-text-layout-and-legibility`, `breadcrumbs`, `form-factor-adaptation`, `accessibility`, `dark-mode`, `typography`, `css-layout`, `responsive-table`, `responsive-design`, `navbar`) | Before authoring headings, breadcrumbs, forms, tables, or dark-mode UI |
| [primitives-and-tokens.md](file:///c:/Users/patri/dev/CMS-V2/.agents/skills/cms-ui-consistency-library/references/primitives-and-tokens.md) | Markdown | Quick JSX copy-paste patterns for `PageHeader`, `MetricGrid`, `StatCard`, `SectionHeader`, `FilterToolbar`, and token rules | When implementing or refactoring any component |
| [cross-role-checklist.md](file:///c:/Users/patri/dev/CMS-V2/.agents/skills/cms-ui-consistency-library/references/cross-role-checklist.md) | Markdown | Multi-role verification protocol (`Student`, `Instructor`, `Faculty`) and isolated Playwright/Vitest commands | Before closing a UI task |

## Mandatory Workflow

1. **Consult `modern-web-guidance` first** when authoring UI/HTML/CSS changes:
   ```sh
   npx.cmd -y modern-web-guidance@latest search "<2-5 word capability>" --skill-version 2026_11_09-5bcc021b
   npx.cmd -y modern-web-guidance@latest retrieve "<guide-id>"
   ```
2. **Compose inside `DashboardLayout`** (`max-w-7xl` default) using `@/components/common` (`PageHeader`, `MetricGrid`, `StatCard`, `SectionHeader`, `FilterToolbar`). Never add bespoke per-page `max-w-5xl`/`max-w-6xl`/`max-w-[1600px]` overrides or a second `<h1>`.
3. **Preserve Institutional & Accessibility Contracts**:
   - Single `<h1>` per page (`PageHeader`), `text-wrap: balance` on headings (`h1, h2, h3`), decorative icons marked `aria-hidden="true"`, icon-only buttons given `aria-label`.
   - `SophisticatedDocumentViewer` remains mandatory for all submission/manuscript viewing.
   - Touch target floor (`min-h-11` / `44px`) on mobile actions; zero horizontal overflow (`scrollWidth <= clientWidth` at `390px` and `1440px`).
4. **Verify**: Run targeted Vitest suites (`$env:TEMP` inside `scratch/`), scoped ESLint, `vite build`, endpoint/governance checks, and an isolated Playwright light/dark desktop/mobile audit.
