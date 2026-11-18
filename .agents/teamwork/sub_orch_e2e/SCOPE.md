# Scope: E2E Testing Track

## Architecture
- Opaque-box requirement-driven testing architecture derived from `ORIGINAL_REQUEST.md` and user specs
- 4-Tier Test Case Hierarchy adhering to ISO/IEC/IEEE 29119-3 standards
- Anti-simulation Playwright harness (`scripts/qa-browser-e2e.mjs`)
- 11 Dedicated Seed Account personas covering all institutional roles

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 17 | E2E Testing Infrastructure Setup | Establish opaque-box test runner, Playwright configurations, and 4-tier test case hierarchy (Tiers 1–4) derived from user requirements | E2E-M1 | PROJECT.md |
| 18 | Tier 1: Feature Coverage E2E Suite | Implement >=5 test cases per feature across UI, deliverables, and role actions | E2E-M2 | PROJECT.md |
| 19 | Tier 2: Boundary & Corner Case Suite | Implement boundary tests (empty inputs, role mismatches, unauthorized access, late justification flags) | E2E-M2 | PROJECT.md |
| 20 | Tier 3: Cross-Feature Combinations Suite | Implement pairwise cross-feature tests across student proposal, instructor approval, committee assignment, and ADM signatures | E2E-M3 | PROJECT.md |
| 21 | Tier 4: Real-World Application Scenarios | Implement end-to-end multi-role scenarios from team formation to archival and certificate issuance | E2E-M3 | PROJECT.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E-M1 | Test Infrastructure & Anti-Simulation Harness | Feature 17 | none | IN_PROGRESS |
| E2E-M2 | Feature & Boundary Test Suite (Tiers 1 & 2) | Features 18, 19 | E2E-M1 | PLANNED |
| E2E-M3 | Integration & Full-Lifecycle Scenarios (Tiers 3 & 4) | Features 20, 21 | E2E-M2 | PLANNED |
| E2E-M4 | Documentation & Readiness Publication (TEST_INFRA.md, TEST_READY.md) | Features 17-21 verification & publication | E2E-M3 | PLANNED |

## Interface Contracts
### E2E Test Runner Contract
- Invocation: `node scripts/qa-browser-e2e.mjs`
- Test Output: Standard exit code 0 on all pass, exit code 1 on any failure.
- Output Artifacts:
  - ISO/IEC/IEEE 29119-3 execution table in Markdown
  - Structured JSON test results in `scratch/qa-evidence/results.json`
  - Playwright visual capture screenshots in `scratch/qa-evidence/`
- Zero-Simulation Enforcement: Real DOM selectors, actual form fills, button clicks, API mutations, and post-action DOM assertions. No synthetic `status: 'Pass'` push without action.
- Liveness & Anti-Hang Guards:
  - Strict `networkidle` elimination (use `waitUntil: 'domcontentloaded'`).
  - Session hydration handling (`waitForSelector('text=Initializing session...', { state: 'detached' })`).
  - Hard safety watchdog timeouts (110s).
