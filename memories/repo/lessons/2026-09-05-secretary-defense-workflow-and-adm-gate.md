# Lesson Learned: Committee Secretary Defense Workflow & Action Done Matrix (ADM) Endorsement Gate

## Incident & Architectural Context
During oral defenses (Proposal, Midterm, Progress, and Final Defenses), the Committee Secretary serves as the official documentarian, score consolidator, and compliance tracking bridge. Prior to this integration:
1. Revisions voiced by panelists were logged primarily via manual note-taking or static PDF uploads without live revision itemization, categorized tagging, or real-time panelist attribution.
2. Individual rubric scores were calculated independently, lacking automated composite weighting, passing threshold validation (>= 75%), or consensus verdict recording with chair sign-off.
3. Once student teams revised their work, committee members (Adviser, Panelists, Chair) could apply digital signatures without an official prerequisite verification by the Committee Secretary certifying that all defense remarks had been fulfilled in the manuscript and source code.

## Lesson Learned
1. **Live Defense Session Architecture**:
   - The Committee Secretary logs discrete revision items in real-time categorized under 6 institutional domains (`Manuscript / Literature`, `System Architecture / Backend`, `UI/UX`, `Database Schema`, `Methodology & Implementation`, `General / Other`) with panelist attribution, severity level, and specific page/module anchors.
   - Real-time room broadcasting via Socket.IO (`emitToRoom('project:<projectId>', 'defense:minutes_updated', ...)`) keeps panelists and proponents synchronized during defense hearings.
2. **Automated Score Aggregation & Threshold Verification**:
   - `defenseMinutes.service.js` consolidates rubric sheets, computes weighted composite scores, and verifies that the score meets or exceeds the institutional 75% passing threshold.
   - Verified scores are locked (`compositeScores.isLocked = true`) with digital timestamps and chair confirmation.
3. **Consensus Verdict & Atomic ADM Publishing**:
   - Consensus verdicts (`approved`, `minor_revisions`, `major_revisions`, `failed`) and panel remarks are finalized with Chair sign-off.
   - Publishing converts minutes entries directly into project `actionDoneMatrix` rows with status `pending_developer_action`, advancing `admStatus` to `in_progress` and notifying student proponents.
4. **Secretary Compliance Verification Endorsement Gate**:
   - The Secretary Endorsement Gate (`admSignatures.secretary.endorsed = true`) is an immutable prerequisite. In `project.controller.js:signTieredADM`, committee members cannot sign Tier 1, 2, or 3 until the Secretary endorses the matrix (`POST /api/adm/:projectId/endorse`).
   - In the frontend `ActionDoneMatrixTab.jsx`, an institutional Secretary Compliance Verification Gate banner appears above Tier 1. If unendorsed, signatory cards display an amber `Awaiting Secretary Endorsement` badge with locked digital signing triggers.

## Prevention Checklist
- [x] Always enforce capability checks for defense documentation (`defense.minutes:create`, `defense.verdict:finalize`, `revisions.matrix:publish`, `revisions.matrix:endorse`).
- [x] In `signTieredADM`, verify `project.admSignatures.secretary.endorsed === true` before permitting non-instructor Tier 1, Tier 2, or Tier 3 signatures.
- [x] When student teams address all revision items, require submission for endorsement via `submitADMForEndorsement` (`POST /api/adm/:projectId/submit-for-endorsement`).
- [x] Ensure Socket.IO room broadcasting (`emitToRoom`) exists in `socket.service.js` for project-specific live updates.
- [x] Verify API endpoint parity (`npm run check:endpoints`) and maintain `UNMATCHED_COUNT = 0`.

## Runbook for Future Defense Workflow Updates
1. When modifying defense minutes or ADM schemas, verify both `server/modules/submissions/defenseMinutes.model.js` and `server/modules/projects/project.model.js`.
2. Ensure frontend service calls in `client/src/services/defenseMinutesService.js` match backend endpoints mounted in `server/modules/submissions/defenseMinutes.routes.js`.
3. In `ActionDoneMatrixTab.jsx`, keep the 4 institutional table columns (`Name of Panel`, `Suggestion of the Panel(s)`, `Action Taken`, `Page Number/s`) and the 3-Tier Signatories Board intact.
4. Execute `npm run check:endpoints`, `npm test --workspace=client`, and `npm test --workspace=server -- tests/unit/defenseMinutes.test.js` to ensure zero regressions.
