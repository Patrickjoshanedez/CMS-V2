## 2026-11-13T17:52:01Z
You are sub_orch_m4_explorer_2.
Your state folder is: c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m4_explorer_2
Your working directory is: c:\Users\patri\dev\CMS-V2

MANDATORY FIRST STEP:
Read c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md.
Also read:
- c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m4\SCOPE.md

Objective:
Investigate Mongoose User models, schemas, validations, shared role constants, and committee rules.
Check:
1. Find the User Mongoose model (`server/models/user.model.js` or `server/models/User.js`) and inspect its schema fields, validators, required fields, and pre-save hooks.
2. Check `shared/` constants (e.g. `PRIMARY_ROLES`, `COMMITTEE_ROLES`, etc.) to see allowed role strings. Specifically check:
   - Is `dean` a separate role, or is dean `role: 'faculty'` with title/designation 'Dean' or `role: 'admin'`?
   - What roles are valid for `instructor`, `adviser`, `secretary`, `panelchair`, `panelist2`, `panelist3`?
   - Confirm institutional rule: `role: 'instructor'` must NOT be appointed to committee roles. Committee roles are appointed under `role: 'faculty'`.
3. Check password hashing in User schema: does pre-save hook hash `password` using `bcrypt` if `isModified('password')`? How does `user.comparePassword()` work?
4. What required fields must be provided when creating a user (e.g., `studentId` for students, `facultyId` or `employeeId` for faculty, `program`, `department`, `college`)?
5. Check if `Team` or `Project` models have committee structures that reference these users, and what format they expect.
6. Provide clear recommendations for how the 11 seed accounts must be defined so they satisfy 100% of Mongoose validations and institutional rules.

Constraints:
- You are READ-ONLY. DO NOT edit or modify source code files.
- Write your complete findings and recommendations to `handoff.md` in your state folder: `c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m4_explorer_2\handoff.md`.
- Update your `progress.md` in your state folder with a liveness timestamp.
- When finished, send a message to the caller with a concise summary and reference your handoff.md path.
