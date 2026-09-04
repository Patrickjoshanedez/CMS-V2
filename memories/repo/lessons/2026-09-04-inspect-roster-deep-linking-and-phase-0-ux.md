# Lesson Learned: Inspect Roster Deep-Linking & Phase 0 Capstone Workflow UX

## Incident & Context
When users (instructors/faculty) clicked **"Inspect roster"** on team formation notification cards, the application routed to `/teams?teamId=<id>`, but:
1. `TeamsPage.jsx` did not inspect `useSearchParams()`, meaning the targeted team was not auto-selected or brought into focus.
2. If the targeted team was not on page 1 of paginated team results, it was missing from the local query cache.
3. The top navigation bar in `Header.jsx` displayed "My Team" for all users on `/teams`, confusing instructors and faculty who are managing cohort teams rather than participating as student proponents.
4. There was no dedicated modal or verification surface for BukSU **Phase 0 (Team Formation & Roster Locking)**, where instructors need to verify the 5 standardized proponent roles (`Project Lead & Systems Analyst`, `Frontend & UI/UX Developer`, `Backend & Database Developer`, `Full-Stack Developer`, `QA & Technical Documentor`) and appoint committee members.

## Lesson Learned
1. **Deterministic Single-Entity Deep Linking**:
   - Deep-linking by ID (`?teamId=...`) must be supported at both the API layer (`team.validation.js` allowing `teamId` and `team.service.js` querying by `_id`) and client layer (`useTeamById(teamId)`).
   - This ensures that even if a team is on page 5 or outside current filter bounds, deep-links always resolve deterministically.
2. **Dedicated Phase 0 Inspection Modal**:
   - `InspectRosterDialog.jsx` portaled to `document.body` provides a focused, high-contrast modal displaying locked status, members with their standardized 5 roles, leader badge, and committee appointments.
   - It also triggers `AssignCommitteeDialog` directly for immediate action.
3. **Role-Aware Header Titles**:
   - In `Header.jsx`, `getPageTitle` must consider the active user role. `/teams` maps to `'My Team'` strictly for students, while faculty and instructors see `'Teams'`.
4. **Valid DOM Nesting in React**:
   - Avoid wrapping clickable cards containing `<button>` action elements inside an outer `<button>` element. Instead, make action triggers styled elements (e.g. `span` with `role="button"` and `tabIndex={0}`) or separate card click zones, preventing `validateDOMNesting` warnings and click bubbling anomalies.

## Prevention Checklist
- [x] When introducing deep-linking query parameters (like `?teamId=`), always implement both URL param parsing (`useSearchParams`) and a dedicated single-entity query fallback hook (`useTeamById`).
- [x] Add single-entity query filters to the backend validation schema (`listTeamsQuerySchema`) and service filter.
- [x] Check `Header.jsx` to ensure titles adapt dynamically based on user role (`isStudent ? 'My Team' : 'Teams'`).
- [x] Never nest interactive `<button>` elements inside other `<button>` elements.
- [x] Run `npm test --workspace=client` and `npm test --workspace=server` after UI workflow modifications.

## Runbook for Future Team Workflow Updates
1. When modifying `/teams` routes or query params, check `client/src/pages/teams/TeamsPage.jsx` and `client/src/hooks/useTeams.js`.
2. Ensure Phase 0 requirements (5 standardized roles, 2-4 members, locked status, and committee appointments: Adviser, Secretary, 3 Panelists) are preserved on all roster views.
3. Test deep-linking directly via URL query parameters (`/teams?teamId=<24-char-mongo-id>`).
