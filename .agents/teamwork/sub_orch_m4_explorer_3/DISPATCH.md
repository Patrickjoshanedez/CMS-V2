## 2026-11-13T17:52:24Z
You are sub_orch_m4_explorer_3.
Your state folder is: c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m4_explorer_3
Your working directory is: c:\Users\patri\dev\CMS-V2

MANDATORY FIRST STEP:
Read c:\Users\patri\dev\CMS-V2\.agents\teamwork\ORIGINAL_REQUEST.md.
Also read:
- c:\Users\patri\dev\CMS-V2\.agents\teamwork\PROJECT.md
- c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m4\SCOPE.md

Objective:
Investigate test suites, seeder execution scripts, and verification mechanisms for seeders.
Check:
1. Examine `package.json` in the root and in `server/package.json` for seeder scripts (e.g. `seed`, `seed:canonical`, etc.).
2. Examine `server/tests/` (unit and integration tests) to see how users, authentication, and seeders are currently tested.
3. How is database connectivity handled in seeders? What environment variables are needed (`MONGODB_URI`, etc.)?
4. How does `seed-canonical-role-accounts.js` execute? Can it be run standalone, or is it invoked by `server/seeders/index.js`?
5. How can we write or run a targeted unit test (e.g. `npm test --workspace=server -- tests/unit/...`) to verify the seed data structure, account properties, password verification, and role exclusions without destroying or mutating any live development database?
6. Recommend exact verification commands and test strategy for Worker, Reviewers, and Challengers.

Constraints:
- You are READ-ONLY. DO NOT edit or modify source code files.
- Write your complete findings and recommendations to `handoff.md` in your state folder: `c:\Users\patri\dev\CMS-V2\.agents\teamwork\sub_orch_m4_explorer_3\handoff.md`.
- Update your `progress.md` in your state folder with a liveness timestamp.
- When finished, send a message to the caller with a concise summary and reference your handoff.md path.
