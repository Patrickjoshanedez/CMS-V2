# Lesson Learned: User Management Primary Roles & Faculty Consolidation

## Incident & Context
In the User Management module (`/users` -> Role Management tab), the role dropdowns previously displayed the full internal `ROLE_VALUES` array (`student`, `faculty`, `adviser`, `panelist`, `instructor`). In addition:
- Seeded accounts had `role: 'adviser'` (Leon Mentor) and `role: 'panelist'` (Steven Joe Bautista).
- When filtering by `Faculty`, the backend performed an exact match (`{ role: 'faculty' }`), which returned "No users found" despite seeded faculty existing in the database.
- Selecting `Adviser` in the dropdown returned Leon Mentor, breaking the BukSU institutional principle that Adviser, Secretary, Panelist, and Chair are committee appointments rather than standalone top-level account roles.

## Lesson Learned
1. **Primary Role Scope vs Committee Appointments:**
   Primary user accounts must only be one of three roles:
   - `student` (Student)
   - `instructor` (Instructor)
   - `faculty` (Faculty)
   Committee roles (`adviser`, `panelist`, `secretary`, `chair`) are contextual appointments on capstone teams/projects, held by members under the `faculty` umbrella.
2. **Backwards-Compatible Faculty Query Expansion:**
   In `user.service.js:listUsers`, when a query filters by `role: 'faculty'`, the service layer must expand the MongoDB query to `{ $in: ['faculty', 'adviser', 'panelist'] }`. This ensures seeded or legacy records with specific sub-roles are seamlessly retrieved without manual DB migrations.
3. **UI Display & Select Normalization:**
   In the client table (`UsersPage.jsx`), `RoleBadge` maps any of `faculty`, `adviser`, `panelist`, `chair`, `secretary` to display "Faculty", and `UserRow` normalizes `user.role` so that the `<select>` displays and selects "Faculty".

## Prevention Checklist
- [x] Use `PRIMARY_ROLE_VALUES` instead of `ROLE_VALUES` for any user-facing account role dropdown or filter.
- [x] Ensure `user.service.js` expands `faculty` queries to include legacy `adviser` and `panelist` roles.
- [x] Map legacy faculty roles in `RoleBadge` so users never see confusing fragmented roles in directory lists.
- [x] Run `UsersPage.test.jsx` and `user.service.faculty-query.test.js` to guard against regressions.

## Runbook for Future Role Management Updates
1. Primary roles are defined in `shared/constants/roles.js` as `PRIMARY_ROLES` and re-exported in `shared/index.js`.
2. Do not add defense committee roles to `PRIMARY_ROLES`.
3. If new faculty appointments are introduced, add them to `PANEL_ROLES` or `FACULTY_ROLES`, keeping `PRIMARY_ROLES` strictly bounded to Student, Instructor, and Faculty.
