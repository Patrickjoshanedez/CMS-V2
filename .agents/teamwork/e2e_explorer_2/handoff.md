# Handoff Report — Anti-Simulation Playwright Harness Architecture (`scripts/qa-browser-e2e.mjs`)

**Agent**: `e2e_explorer_2` (Playwright Harness Investigator & Architect)  
**Parent Conversation ID**: `1d510dcc-9499-4a34-9b6f-1193ae141e8b`  
**Target File Analyzed**: `scripts/qa-browser-e2e.mjs` (Specification & Design)  
**Deliverable Path**: `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_explorer_2\harness_analysis.md`  
**Date**: November 14, 2026  

---

## 1. Observation

Direct file inspections and forensic analysis revealed the following concrete evidence across the repository:

1. **Simulated Finishes & Hardcoded Passes in Existing Runners**:
   - `scripts/e2e-capstone-core-scenarios.js`:
     - Lines 194–196: Only authenticates as `student@student.buksu.edu.ph` (`await performLogin(page, PERSONAS.student);`). Never switches roles to Instructor, Adviser, Secretary, Panelist, or Dean.
     - Line 222: Fallback passes test purely on URL: `const pass = hasTeamsContent || page.url().includes('/teams');`.
     - Lines 257–263 (TC-E2E-002): Hardcoded pass without filling proposals or running pre-scans:
       ```javascript
       results.push({
         ...tc,
         actual: `Proposal workspace and proposal options rendered at ${page.url()}. SDGs and disciplines verified.`,
         status: 'Pass',
         remarks: `Verified candidate proposal tabs, SDG tags, and similarity pre-scan interface. Evidence: scratch/qa-evidence/${tc.id}.png`,
         duration,
       });
       ```
     - Hardcoded `status: 'Pass'` repeated across lines 286, 312, 343, 372, 401, 430, and 458 for manuscript upload, defense hearings, Gantt charts, ADM logging, and digital signatures without actual DOM interactions.
   - `scripts/qa-test-runner.js`:
     - Lines 406–414: In `evaluateSteps(tc)`, unconditionally marks all 173 test cases as `status: 'Pass'` by slicing the static `expected` string after simply navigating to the route:
       ```javascript
       let actualSummary = `${tc.expected.replace(/<br>/g, ' ').replace(/\n/g, ' ').slice(0, 110)}. Confirmed at ${targetPath}.`;
       return {
         status: 'Pass',
         actual: actualSummary,
         remarks: `Automated Playwright verification passed. Role: ${requiredRole}. Page Title: "${pageTitle}". Evidence: scratch/qa-evidence/${tc.id}.png`,
       };
       ```
     - Because it only waits for `domcontentloaded` and 400ms without awaiting session hydration, screenshots capture pages with titles such as `"Loading http://localhost:43211/register"` (`docs/testing/BukSU_CMS_V2_Exhaustive_System_Manual_Test_Suite_ISO29119.md:72`).

2. **Indefinite `networkidle` Hang Violations**:
   - `scripts/test-all-roles-browser.mjs:116`:
     ```javascript
     await page.waitForLoadState('networkidle');
     ```
   - `scripts/playwright-workflow-visual-audit.mjs:30, 35, 39`:
     ```javascript
     await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
     await page.waitForLoadState('networkidle');
     await page.goto(`${BASE_URL}${step.url}`, { waitUntil: 'networkidle', timeout: 15000 });
     ```
   - Both violate the repo-wide `networkidle` ban (AGENTS.md Rule 16 & GEMINI.md Section 8), which mandates never using `networkidle` due to CMS-V2's real-time notification poller (`/api/notifications?page=1&limit=1`) and WebSocket heartbeats.

3. **Session Hydration & Skeleton Settle Dynamics**:
   - `client/src/App.jsx:326–334`:
     ```javascript
     if (sessionLoading) {
       return (
         <>
           <ThemeSync />
           <LoadingScreen showLogo={true} message="Initializing session..." />
         </>
       );
     }
     ```
   - `client/src/stores/authStore.js:236–248`: On initial load, `sessionLoading` defaults to `true` while `fetchUser()` invokes `GET /api/users/me`.
   - Tests attempting immediate DOM interactions or assertions without awaiting detachment of `text=Initializing session...` encounter missing element exceptions, flash-redirects to `/login`, or stale assertions against `.animate-pulse` skeletons.

4. **Institutional Role Boundary Violations in Seeders**:
   - `scripts/seed_demo_state.js:39–75`: Seeds committee members (Labastida, Lecaros, Abella, Santos, Jenkins) with `role: 'instructor'` instead of `role: 'faculty'`, violating the institutional rule that Course Instructors cannot serve on defense committees.

---

## 2. Logic Chain

1. **From Observation 1 (Simulated passes)** $\rightarrow$
   Current test reports showing 100% pass rates are deceptive. Scripts do not perform form fills, file uploads, rubric evaluations, or ADM digital signing; they merely assert URL navigation and fabricate pass statuses. Therefore, a standalone anti-simulation runner must be created where every test step maps to physical DOM events and verifies post-mutation DOM states.
2. **From Observation 2 (`networkidle` hangs)** $\rightarrow$
   `networkidle` waits for zero network connections for 500ms. CMS-V2's continuous notification poller (`/api/notifications`) and Socket.IO heartbeat packets guarantee that network activity never ceases for 500ms. Therefore, `networkidle` must be strictly replaced with `waitUntil: 'domcontentloaded'` and explicit semantic locator waiting (`await locator.waitFor({ state: 'visible' })`).
3. **From Observation 3 (Hydration races)** $\rightarrow$
   Hard page loads render `LoadingScreen` with `"Initializing session..."` while `fetchUser` executes. Premature locator queries fail because components have not mounted. Furthermore, subsequent queries display `.animate-pulse` skeletons. Therefore, a deterministic synchronization helper `waitForHydrationAndSettle(page)` is strictly required after all navigations and logins before interacting with elements.
4. **From Cookie-Based Auth & Session Contamination** $\rightarrow$
   CMS-V2 stores credentials in HTTP-only cookies. Reusing a single browser context across multiple personas causes cookie bleeding and invalid session states. Therefore, the test runner must provision a fresh `BrowserContext` per persona scenario (`withPersona(browser, persona, callback)`) and destroy it upon completion.
5. **From Watchdog Rules & 120s Limit** $\rightarrow$
   Under AGENTS.md Rule 16, commands taking > 120s are runaway processes. A test suite must establish an unref'd 110-second watchdog timer (`setTimeout(..., 110000)`) with guaranteed process termination and browser closure in a top-level `finally` block.

---

## 3. Caveats

- **Seeder Dependency**: The execution of Tier 4 scenarios in `scripts/qa-browser-e2e.mjs` assumes that all 11 dedicated canonical accounts exist in the database (or are provisioned via `server/seeders/seed-canonical-role-accounts.js` or pre-test setup). If accounts are missing, scenarios will fail with authentication errors.
- **Backend & Client Dev Server Liveness**: The test runner requires the live frontend client (port 43211 or configured `CLIENT_URL`) and backend server (port 5000 or configured `API_URL`) to be running.
- **Fixture Availability**: File upload scenarios (Chapters 1–3 and Chapter 4) require valid `.docx` / `.pdf` fixture buffers or files in `scripts/fixtures/`.

---

## 4. Conclusion

The existing E2E runner scripts (`e2e-capstone-core-scenarios.js`, `qa-test-runner.js`, `test-all-roles-browser.mjs`, and `playwright-workflow-visual-audit.mjs`) are compromised by synthetic passes, single-role execution, `networkidle` hang hazards, and hydration race conditions.

The complete architectural blueprint and implementation specification for `scripts/qa-browser-e2e.mjs` has been authored and documented in `c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_explorer_2\harness_analysis.md`. It provides:
1. Zero simulation: physical DOM actions with real assertion evaluations.
2. Complete elimination of `networkidle` via `waitUntil: 'domcontentloaded'` and semantic locators.
3. Deterministic session hydration and skeleton settle handling via `waitForHydrationAndSettle`.
4. Strict browser context isolation per role persona.
5. 110-second hard watchdog ceiling with guaranteed process and browser teardown.
6. 4-Tier Test Case Hierarchy covering UI, boundaries, cross-feature integrations, and 14 chained real-world application scenarios across all 11 dedicated seed accounts.

---

## 5. Verification Method

To independently verify this investigation and the architectural specification:

1. **Inspect Architectural Specification**:
   ```bash
   # Read the full architectural analysis and runnable code blueprint
   Get-Content -Path c:\Users\patri\dev\CMS-V2\.agents\teamwork\e2e_explorer_2\harness_analysis.md
   ```
2. **Inspect Existing Test Runner Defects (Line Verification)**:
   - Check `scripts/e2e-capstone-core-scenarios.js` lines 222, 260, 286, 312, 343, 372, 401, 430, 458 to confirm hardcoded `status: 'Pass'`.
   - Check `scripts/qa-test-runner.js` lines 406–414 to confirm synthetic pass generation.
   - Check `scripts/test-all-roles-browser.mjs` line 116 to confirm `await page.waitForLoadState('networkidle')`.
   - Check `client/src/App.jsx` lines 326–334 to confirm the `<LoadingScreen message="Initializing session..." />` hydration barrier.
3. **Invalidation Conditions**:
   - The analysis would be invalidated if `networkidle` could settle in under 500ms while real-time notification polling is active (empirically disproven).
   - The analysis would be invalidated if existing test runners were found to execute real DOM form submissions (disproven by line-by-line inspection).
