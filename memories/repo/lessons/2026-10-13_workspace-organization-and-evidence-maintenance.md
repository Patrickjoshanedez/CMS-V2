# Lesson: Systematic Workspace Organization, Evidence Maintenance, and Authority Classification

- **Date:** 2026-10-13
- **Author:** Lead Maintenance Agent
- **Topic:** Systematic Workspace Organization, Machine-Readable Manifest, Reusable Skill Codification, and Negative Validator Verification

## 1. Context and Problem Statement
In large, evolving academic repositories such as BukSU CMS-V2, file sprawl and evidence drift frequently emerge when:
1. Scripts are saved casually into documentation folders (e.g. `docs/generate_test_cases.py`), violating structural whitelists.
2. Superseded or historical specifications linger without explicit authority indicators or links to replacements.
3. Tests and benchmarks are conflated, leading to claims of model accuracy based purely on unit mocks.
4. Validation suites only check for positive states without negative fixture pressure-testing.

## 2. Key Lessons Learned
- **Lesson learned (Layout Whitelist Enforcement):** All executable automation, test case generation, and validation scripts belong strictly in `scripts/`. Migrating `docs/generate_test_cases.py` to `scripts/generate_test_cases.py` with relative output resolution (`Path(__file__).resolve().parent.parent / "docs" / "CMS_V2_Test_Cases.xlsx"`) preserves reproducibility while maintaining pristine workspace boundaries.
- **Lesson learned (Machine-Readable Manifest):** Creating `docs/classification-manifest.json` provides an unambiguous, programmatic registry for current, needs-review, superseded, historical, and generated files, tracking governing requirements and verifiable replacement links.
- **Lesson learned (Skill Codification):** Authoring `.agents/skills/workspace-evidence-maintenance/SKILL.md` and binding it via Item 19 in `AGENTS.md` and `docs/AUTHORITATIVE_INDEX.md` guarantees future agents adhere to the 7-step operational checklist: `Inspect → Classify → Check references → Patch or move → Verify → Update index → Record evidence`.
- **Lesson learned (Negative Fixture Verification):** A validator is only trustworthy if it fails when presented with invalid input. Testing `scripts/verify_workspace_evidence.py` against synthetic invalid fixtures in `scratch/test_validator_negative_fixtures.py` proved that malformed manifest schemas, missing replacement files, expired test quarantines, corrupt JSONL, and broken local markdown links are reliably rejected.

## 3. Prevention Rules
- Always consult `.agents/skills/workspace-evidence-maintenance/SKILL.md` before moving, archiving, or retiring repository artifacts.
- Never place loose `.py`, `.js`, `.sh`, or `.ps1` scripts in `docs/` or root; all scripts must live in `scripts/`.
- Always update both `docs/AUTHORITATIVE_INDEX.md` and `docs/classification-manifest.json` when modifying document authority or status.
- Never weaken assertions or skip tests without registering a tracked quarantine in `docs/TEST_QUARANTINE.md` with an accountable owner and strict resolution deadline.

## 4. Runbook & Verification Checklist
1. **Checklist (Manifest & Structure):** Run `npm run check:evidence` to confirm 34/34 checks pass cleanly.
2. **Checklist (Generator Verification):** Run `python scripts/generate_test_cases.py` to ensure `docs/CMS_V2_Test_Cases.xlsx` is generated without error.
3. **Checklist (Negative Sandbox):** Run `python scratch/test_validator_negative_fixtures.py` to confirm 4/4 synthetic failure scenarios are rejected.
4. **Evidence (API Endpoint Parity):** `npm run check:endpoints` passed with UNMATCHED_COUNT = 0 (222 server routes, 202 client routes).
5. **Evidence (Agentic Governance):** `npm run validate:agentic` passed 60/60 checks.
6. **Evidence (Governance Pipeline):** `npm run validate:governance` passed 100% (11 agents, 8 edges, 0 cycles, 0 conflicts).
7. **Evidence (Targeted Server Reliability):** `npm test --workspace=server -- tests/unit/institutionalWorkflow.reliability.test.js` passed (8/8 passed).
8. **Evidence (Targeted Client ADM):** `npm test --workspace=client -- src/components/projects/adm/admWorkflow.test.js` passed (5/5 passed).
9. **Evidence (Workspace Guardrail):** `python scripts/workspace_guardrail.py` passed (workspace is pristine).
