# Faculty Committee Dropdown Query and Limit Hardening

## Problem
When opening `AssignCommitteeDialog`, the Capstone Adviser, Committee Secretary, and Panelist dropdowns displayed only the default placeholder (e.g. `-- Select faculty adviser --`) with zero selectable faculty members, despite the database having been seeded with faculty accounts (instructor, adviser, panelist).

## Root Causes
1. **Zod Limit Cap Mismatch**: In `server/modules/users/user.validation.js`, `listUsersQuerySchema` capped `limit` at `max(100)`. Frontend bulk dropdown components passed `{ limit: 200 }`. Zod failed with HTTP 400 (`Too big: expected number to be <=100`), causing the React Query request to silently fail.
2. **Missing Role Filter & Pagination Displacement**: `AssignCommitteeDialog` queried all users without a `role` filter. Because `User.find().sort({ createdAt: -1 })` returns newest users first, and faculty accounts were seeded first, the 37+ student accounts filled up the page, pushing faculty off page 1.
3. **No Multi-Role Backend Filtering**: `userService.listUsers` only supported matching a single `role` enum value, preventing clients from requesting all candidate faculty roles in one network request.

## Prevention Rule
- Always align Zod query pagination caps with frontend bulk picker expectations (allow up to 500).
- Candidate selection queries for specific workflows (like faculty committee assignment) must filter by role on the database layer (`role: { $in: roles }`) rather than fetching all users and filtering client-side.
- Provide clear dynamic placeholders in select elements for loading and empty states.

## Runbook
1. If dropdowns appear empty after seeding, inspect the network tab for HTTP 400 validation errors on query parameters.
2. In `user.validation.js`, ensure `listUsersQuerySchema` allows multi-role unions and string splitting piped into enum validation.
3. In `user.service.js`, ensure `role` filters handle arrays, comma-separated strings, and single values.
4. Verify tests pass with `npm --prefix server run test -- tests/unit/user.list-query.validation.test.js` and `npm test --workspace=client -- src/components/teams/AssignCommitteeDialog.test.jsx`.

## Checklist
- [x] `listUsersQuerySchema` accepts `limit` up to 500.
- [x] `listUsersQuerySchema` supports single enum, array, and comma-separated roles.
- [x] `userService.listUsers` applies `{ role: { $in: roles } }` when multiple roles are passed.
- [x] `AssignCommitteeDialog` requests candidate faculty roles explicitly.
- [x] `AssignCommitteeDialog` displays dynamic placeholder states for loading, empty, and populated.
- [x] Full quality gate verification suite passes.
