# Cross-Role Verification & Visual Audit Checklist

## 1. Per-Role Visual Parity Checks

- **Student (`student`)**:
  - `/dashboard`, `/teams`, `/project`, `/project/create`, `/project/approval`, `/project/submissions`, `/project/submissions/upload`, `/project/proposal`, `/archive`, `/plagiarism-checker`, `/profile`, `/settings`, `/notifications`
- **Instructor (`instructor`)**:
  - `/dashboard`, `/teams`, `/projects`, `/committee-assignments`, `/scheduling-center`, `/users`, `/reports`, `/admin/audit`, `/admin/evaluation-templates`, `/archive/upload/capstone`
- **Faculty (`faculty` — Adviser, Panelist, Secretary views)**:
  - `/dashboard` (3-tab switcher: Adviser, Panelist, Secretary), `/teams`, `/projects`, `/adviser/team-review`, `/secretary-review`

## 2. Automated Verification Commands (Windows Safe)

Run Vitest shards **sequentially** with `$env:TEMP` under `scratch/` so worker startup never times out:

```powershell
# Targeted fast-path (1-5s iteration)
$env:TEMP = Join-Path (Get-Location) 'scratch/vitest-tmp'
npm test --workspace=client -- src/components/common/CommonLayoutPrimitives.test.jsx

# Full client suite (final closure)
npm test --workspace=client -- --shard=1/2 --maxWorkers=2
npm test --workspace=client -- --shard=2/2 --maxWorkers=2

# Lint & Production Bundle
npx --workspace=client eslint src/components/common
npx --workspace=client vite build
```

## 3. Playwright Visual Matrix

Inspect `desktop (1440x900)` and `mobile (390x844)` in both `light` and `dark` modes without concurrent builds/tests running:
- `document.documentElement.scrollWidth <= document.documentElement.clientWidth` (`overflow = 0px`)
- `document.querySelectorAll('h1').length === 1` inside workspace pages
- Breadcrumb (`[data-testid="header-page-title"]`) aligns with the route scope
- Zero console errors and zero Vite error overlays (`vite-error-overlay`)
- Remove temporary screenshot directories inside `scratch/` before closing the task, then run `python scripts/workspace_guardrail.py`.
