# Team Invariants Lesson (2026-04-09)

- Preserve the no-team invariant in invite-candidate search by composing it into both base filters and search-path filters; never let search-specific $or overwrite membership guards.
- Enforce one-team-per-student at invite acceptance with layered checks: user.teamId precheck, cross-team membership existence check, and atomic claim/update operations with rollback on team update conflicts.
- Add/keep integration coverage for both invariants: search candidate exclusion (including with search query) and invite acceptance rejection when invitee belongs to any team.
