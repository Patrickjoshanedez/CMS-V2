# Responsive layout lesson — 2026-10-14

Lesson learned: zero root horizontal overflow does not prove controls remain visible. The archive toolbar clipped actions inside its own scroller. Prevention: inspect control bounding boxes and screenshots, retain intentional local scrolling, and avoid masking defects with root overflow suppression.

Runbook checklist: use actual application components and valid read-only fixtures; capture desktop/mobile in both themes; validate fixture contracts; distinguish empty states from populated workspaces; inspect document controls and wide timelines after opening drawers; use intrinsic paper width and a reachable zoom origin for OOXML. Sandbox-local frontend servers may be unreachable by external browser processes; run both in the same permitted network environment.

Full client and server quality gates stalled and were terminated under the two-minute rule. Targeted layout tests passed. Do not promote this scoped result to system-wide completion. See docs/RESPONSIVE_LAYOUT_AUDIT.md for exact coverage and outstanding checks.
