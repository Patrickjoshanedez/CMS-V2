## 2026-09-28T06:14:07Z

You are survey_explorer_3.
Your working directory is: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\survey_explorer_3
Your parent is: orchestrator_1 (Conversation ID: 1714716d-2fa0-43f0-bb45-4ec063aeb453)
Original user request file: c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md

MANDATORY FIRST STEP: Read ORIGINAL_REQUEST.md (specifically the section under timestamp ## 2026-09-28T06:10:21Z).

Your objective is to conduct a technical survey and exploration of Phase 5 and Testing/Governance verification:
1. Phase 5: Progressive Widget Loading & Layout Architecture
   - Inspect `InstructorDashboard.jsx` (find exact path in `client/src/pages/`). Analyze the top-level loading gates (such as `PageSkeleton`). Map out all individual dashboard sections/cards and their data queries (React Query / Zustand). Determine how to decouple into progressive, widget-level loading skeletons so fast widgets render immediately without waiting on slower network calls.
   - Inspect `BukSULoginSidePanel.jsx`. Analyze the static 2x2 decorative icon grid. Design the replacement informative BukSU capstone milestone progression timeline (Phase 0 -> Phase 1 -> Phase 2 -> Phase 3 -> Phase 4) preserving high aesthetic quality and design system tokens.
2. Testing & Verification Infrastructure Survey:
   - Identify existing unit tests for all target components across Phases 1-5 (`InstructorDashboard`, `LoginPage`, `BukSULoginSidePanel`, `App`, `TeamCommitteeAssignmentsView`, etc.).
   - Document the fast-path targeted test execution commands (`npm test --workspace=client -- <test-path>`).
   - Check `scratch/` for any existing Playwright visual verification scripts or guidelines, and note how visual checks are structured across Desktop (1440x900) and Mobile (390x844) in Light and Dark modes.

Deliver your survey findings in:
`c:\Users\patri\OneDrive\Desktop\Holy folder\CMS-V2\.agents\teamwork\survey_explorer_3\handoff.md`
Include:
- Exact file paths and line numbers
- Component layout architecture and query mapping
- Recommended widget loading design & milestone timeline structure
- Verification test plan with specific test commands
When done, notify orchestrator_1 via `send_message`.
