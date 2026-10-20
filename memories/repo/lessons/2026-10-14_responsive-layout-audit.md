# Responsive layout lesson — 2026-10-14

Lesson learned: zero root horizontal overflow does not prove controls remain visible. The archive toolbar clipped actions inside its own scroller. Prevention: inspect control bounding boxes and screenshots, retain intentional local scrolling, and avoid masking defects with root overflow suppression. In large test suites (>100 test files) on Windows, monolithic vitest worker pools can trigger watchdog timeouts; partitioning the test index into deterministic 50-file disjoint batches (--pool=threads) guarantees complete test assertion coverage without runaway timeouts.

Runbook checklist: use actual application components and valid read-only fixtures; capture desktop/mobile in both themes; validate fixture contracts; distinguish empty states from populated workspaces; inspect document controls and wide timelines after opening drawers; use intrinsic paper width and a reachable zoom origin for OOXML. Ensure modal dialogs contain a focus trap, inert root, and escape restoration. Sandbox-local frontend servers may be unreachable by external browser processes; run both in the same permitted network environment.

Quality gate verification evidence:
- Client Partition 1 (57 files): passed (362 tests passed, 100.46s).
- Client Partition 2 (57 files): passed (337 tests passed, 81.67s).
- Server Comprehensive Workflow Suite: passed (13 tests in 27.06s).
- API Route Parity: passed (222 server / 202 client, unmatched: 0).
- Agentic Governance: passed (60/60 checks).
- Workspace Evidence & Guardrails: passed (34/34 checks).
- Client Production Build: passed in 9.95s.
- Focused ESLint: passed (0 errors across modified client components and pages).
See docs/RESPONSIVE_LAYOUT_AUDIT.md for exact coverage and detailed component audit findings.
