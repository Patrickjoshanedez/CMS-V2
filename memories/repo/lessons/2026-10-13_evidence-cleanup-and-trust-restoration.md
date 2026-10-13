# Lesson: CMS-V2 Workspace Evidence Restoration, Session Index Healing, and Institutional Archival Gating

- **Date:** 2026-10-13
- **Author:** Lead Maintenance Agent
- **Topic:** Restoring trust in old tests, documentation, workspace evidence, and agent memory

## 1. Context and Problem Statement
A maintenance audit of the CMS-V2 workspace revealed several evidence integrity and trust risks:
1. Session index corruption in `.agents/ptss/index.jsonl`: Two JSON objects were concatenated without a newline on line 217, causing `JSONDecodeError: Extra data` during `hermes-curator` skill auditing. Furthermore, raw unescaped regexes (`\s`, `\d`) broke standard JSON parsers.
2. Incomplete institutional archival enforcement in `server/modules/projects/services/projectArchive.service.js`: Archival requests failed to verify passing defense verdicts or secretary Action Done Matrix (ADM) digital sign-off endorsements, and the phase prerequisite did not handle the curriculum divergence between 4 institutional phases vs legacy semester stage numbers.
3. Overstated model accuracy claims: Plagiarism unit tests mocking Python FastAPI responses proved software control flow and degraded fallbacks, but could not evaluate sentence-transformer accuracy.
4. Broken documentation references and drift: Hardcoded OneDrive links in `AGENTS.md`, missing anchor targets in `README.md`, and references to retired components.
5. Incomplete UI visual audit verification: Previous audits only checked static public landing pages rather than actual modified application routes (`/project/submissions` and `/submissions/:id/plagiarism-report`).

## 2. Key Lessons Learned
- **Lesson learned (Session Index Healing):** Concatenation of JSON records on a single line breaks streaming JSONL decoders. By splitting line 217 into distinct single-line records and indexing previously unindexed sessions (`2026-09-06_capstone-lifecycle-audit-and-perfection`, `2026-09-23_audit-system-algorithms`, `2026-09-25_publication-venue-extraction-precision`), all 213 historical sessions were restored with zero data loss.
- **Lesson learned (Institutional Workflow & Archival):** Archiving capstone projects is an immutable Phase 4 event. `projectArchive.service.js` now strictly requires `capstonePhase: 4` (or `stage: 'final'` / `capstonePhase: 3` with `stage: 'capstone_3'`), an explicitly passing oral defense verdict (`DEFENSE_VERDICT_UNMET`), and secretary ADM endorsement (`SECRETARY_ENDORSEMENT_REQUIRED`).
- **Lesson learned (Benchmark Separation & Provenance):** Neural model accuracy must be evaluated using versioned benchmark datasets (`ISO-BUKSU-V1`, `PAN-SPANS-V1`) defined in `docs/benchmarks/plagiarism-benchmark-spec.md` with fixed scoring weights ($w_{lex}=0.65, w_{sem}=0.35, \theta_{min}=0.78$), completely decoupled from unit test mocked control flows.
- **Lesson learned (Automated Prevention Checks):** Evidence drift cannot be controlled by guidelines alone. Implementing an automated verification suite (`scripts/verify_workspace_evidence.py` / `npm run check:evidence`) checking 23 deterministic rules prevents malformed JSON/JSONL, broken markdown links, expired test quarantines, and retired component references.

## 3. Prevention Rules
- Always run `npm run check:evidence` before concluding any maintenance or architectural intervention.
- Never bypass the institutional committee secretary compliance endorsement gate for any user role.
- Never equate unit test mock responses with empirical model accuracy or benchmark performance.
- When repairing session memory records, never silently delete or fabricate history; preserve original timestamps and payloads.

## 4. Runbook & Verification Checklist
1. **Checklist (Memory Integrity):** Run `python scripts/verify_workspace_evidence.py` to confirm all 213 PTSS sessions and JSON files parse cleanly.
2. **Checklist (Archival Prerequisites):** Run unit tests asserting defense verdict and secretary endorsement rejection when gating criteria are missing.
3. **Checklist (Governance Integrity):** Run `npm run validate:governance` and `npm run validate:agentic` to confirm 60/60 checks pass.
4. **Evidence (Targeted Server Unit Tests):** `npm test --workspace=server -- tests/unit/institutionalWorkflow.reliability.test.js` passed (8/8 passed).
5. **Evidence (Targeted Client ADM Tests):** `npm test --workspace=client -- src/components/projects/adm/admWorkflow.test.js` passed (5/5 passed).
6. **Evidence (Comprehensive Workflows):** `npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js` passed (13/13 passed in 19.18s).
7. **Evidence (Endpoint Parity):** `npm run check:endpoints` passed with UNMATCHED_COUNT = 0.
8. **Evidence (Workspace Evidence Suite):** `npm run check:evidence` passed (23/23 checks passed).
9. **Evidence (Visual Audit Loop):** Playwright authentic visual audit in `scratch/screenshots/` passed across 4 viewports (desktop light/dark, mobile light/dark).
