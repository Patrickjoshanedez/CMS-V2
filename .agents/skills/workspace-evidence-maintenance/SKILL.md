---
name: workspace-evidence-maintenance
description: Systematic workspace organization, evidence maintenance, document authority tracking, test quarantine governance, and evidence drift prevention for BukSU CMS-V2. Use when organizing workspace files, classifying documents, archiving superseded material, updating the authoritative index or classification manifest, managing test quarantines, or validating evidence integrity.
---

# 🗂️ Systematic Workspace Organization and Evidence Maintenance Skill (BukSU CMS-V2)

## 1. Overview & Purpose
This skill governs the systematic organization, classification, retirement, and evidence maintenance of all files, specifications, test suites, generated artifacts, and agent memory records within BukSU CMS-V2.

Its mission is to prevent **workspace clutter, split-brain documentation, unverified claims, and silent evidence drift**. Every action taken under this skill must be traceable, grounded in concrete evidence, and non-destructive to valid historical records.

---

## 2. When This Skill Applies (Triggers)
Activate and adhere to this skill whenever:
- Creating, moving, archiving, consolidating, or deleting documentation files under `docs/` or repository root.
- Updating or verifying the authoritative document hierarchy ([`docs/AUTHORITATIVE_INDEX.md`](../../../docs/AUTHORITATIVE_INDEX.md)) or machine-readable classification manifest ([`docs/classification-manifest.json`](../../../docs/classification-manifest.json)).
- Reviewing, repairing, consolidating, or quarantining test suites in `server/tests/` or `client/src/**/*.test.jsx`.
- Moving or archiving generated test matrices, presentations, or manuscript artifacts (`.docx`, `.pptx`, `.xlsx`).
- Healing, validating, or repairing agent memory records ([`.agents/ptss/index.jsonl`](../../ptss/index.jsonl), [`.agents/ptss/sessions/`](../../ptss/sessions/), `memories/repo/`).
- Resolving contradictions between code implementations, test mocks, and architectural documentation.

---

## 3. Approved File Destinations & Layout Whitelist
All files MUST reside exclusively within the repository whitelist. Creating loose scripts or unvetted directories in root is strictly prohibited:

```
/workspace/
├── client/src/                       ← Active frontend React implementation and tests
├── server/                           ← Active Express/Node.js backend implementation and tests
├── shared/                           ← Canonical shared schemas, role constants, validation
├── plagiarism_engine/                ← FastAPI & PyTorch vector similarity microservice
├── scripts/                          ← Reusable maintenance, verification, and migration tools
├── docs/                             ← Current documentation, specs, and benchmark guidance
│   ├── specs/                        ← Specialized operational specifications
│   ├── benchmarks/                   ← Plagiarism and OCR benchmark protocols & dataset specs
│   ├── archive/                      ← Historical sprint reports & superseded proposals
│   └── templates/                    ← Official university templates (ADM, rubrics, certs)
├── .agents/skills/                   ← Reusable agent skills and procedures
├── .agents/ptss/                     ← Structured session records (index.jsonl & sessions/)
├── memories/repo/                    ← Technical context and learned prevention rules
└── scratch/                          ← Intermediate developer scratch space & disposable evidence
```

### Whitelist Rules:
- **No Long-Lived Authoritative Material in Scratch:** All authoritative documentation must reside in `docs/` or approved directories; `scratch/` is strictly ephemeral.
- **No Historical Files in Active Test Discovery:** Archived test scripts or historical benchmarks must never be placed where `npm test` or vitest globs discover them.
- **No Loose Root Scripts:** All automation, generation, or diagnostic scripts must live under `scripts/`.

---

## 4. The 6-Tier Order of Authority (Conflict Resolution)
When evidence or documentation conflicts across the repository, agents MUST strictly apply this hierarchy:

```
[Level 1: Highest Authority]
Approved Institutional Requirements & Role Boundaries
  (BukSU IT Department capstone guidelines, 4-phase sequence, role consolidation, instructor committee exclusion)
       │
       ▼
[Level 2: Contract Authority]
Approved API Contracts & Intended User Behavior
  (shared schemas, route contracts verified by endpoint parity, role permissions)
       │
       ▼
[Level 3: Implementation Authority]
Implementation Verified Against Those Requirements
  (Express controllers/services, React components passing zero-error gates)
       │
       ▼
[Level 4: Test Authority]
Tests Enforcing Verified Behavior
  (Deterministically passing integration suites, unit suites, and Playwright visual loops)
       │
       ▼
[Level 5: Supporting Guidance]
Supporting Documentation
  (ARCHITECTURE.md, README.md, technical specifications, runbooks)
       │
       ▼
[Level 6: Lowest Authority]
Historical Agent Records & Archived Summaries
  (.agents/ptss/ sessions, archived plans, delivery manifests)
```

> [!IMPORTANT]
> **No Blind Trust:** Neither running code, passing tests, nor historical session records automatically establish correctness. If code conflicts with approved institutional requirements (e.g. archiving in Phase 3 vs Phase 4), the institutional requirement governs. Unresolved conflicts must be documented as `needs-review` rather than resolved by invention.

---

## 5. Concise Operational Checklist
Every workspace maintenance action must follow this 7-step sequence:

$$\text{Inspect} \longrightarrow \text{Classify} \longrightarrow \text{Check References} \longrightarrow \text{Patch or Move} \longrightarrow \text{Verify} \longrightarrow \text{Update Index} \longrightarrow \text{Record Evidence}$$

1. **Inspect:** Examine candidate files using bounded reads (`view_file` with line slices). Record Git status before editing.
2. **Classify:** Determine category and status (`current`, `needs-review`, `superseded`, `historical`, or `generated`).
3. **Check References:** Search for all inbound links, imports, package script triggers, and agent prompts (`git grep <target>`).
4. **Patch or Move:** Apply surgical CST diffs or move files. Update inbound links, imports, and relative paths in the same patch.
5. **Verify:** Run targeted tests and the automated evidence checker (`npm run check:evidence`).
6. **Update Index:** Update [`docs/AUTHORITATIVE_INDEX.md`](../../../docs/AUTHORITATIVE_INDEX.md) and [`docs/classification-manifest.json`](../../../docs/classification-manifest.json).
7. **Record Evidence:** Log the action in [`docs/EVIDENCE_INVENTORY.md`](../../../docs/EVIDENCE_INVENTORY.md) and record learned lessons in `memories/repo/`.

---

## 6. Safe Moves, Reference Updates, and Rollback Procedures
Before moving, archiving, or deleting any file:
1. **Record the baseline:**
   - Current path
   - Purpose and authority level
   - Proposed destination or replacement
   - Active references and dependencies
   - Reason for action
   - Verification and rollback method
2. **Atomic Reference Updating:** Update all referencing files in the exact same batch. Never leave dangling markdown links or broken import statements.
3. **Rollback Strategy:** All git-tracked files can be reverted via `git checkout -- <file>`. Verify clean git state before proceeding.

---

## 7. Test Repair, Preservation, and Retirement Criteria
1. **Preserve Valid Coverage:** Never remove or disable a test that asserts verified institutional rules.
2. **Classify Test Failures Accurately:**
   - Obsolete expectation vs genuine application defect.
   - Timing dependency vs deterministic state.
   - Outdated fixture shape vs shared-state contamination.
3. **No Soft Assertion Weakening:** Never alter assertions or weaken thresholds merely to make a test pass.
4. **Mutation Testing for Critical Gates:** When repairing or hardening critical institutional gates, intentionally break the guard in a scratchpad or temporary mutation to verify that the test fails (`AssertionError`), then restore the guard and re-verify passing status.
5. **Separation of Benchmarks:** Unit tests with mocked responses prove software control flow and degraded fallbacks; they do NOT evaluate neural detection accuracy. Empirical benchmarks must run separately against live containers and versioned datasets.

---

## 8. Test Quarantine Governance Protocol
If a test is genuinely flaky or environment-blocked and cannot be repaired immediately:
1. Do NOT silently comment out or delete the test.
2. Register the test in [`docs/TEST_QUARANTINE.md`](../../../docs/TEST_QUARANTINE.md) with:
   - **Test File & Name:** Exact path and test descriptor.
   - **Failure Reason:** Detailed root-cause explanation.
   - **Tracked Issue / Item:** Tracking reference.
   - **Accountable Owner:** Name or `"unassigned"`.
   - **Resolution Deadline:** Strict ISO date (`YYYY-MM-DD`).
3. Quarantines past their deadline are flagged as failures by `npm run check:evidence`.

---

## 9. Historical-Document Labeling & Supercedence Protocol
When a document is superseded or archived:
1. **Clear Header Banner:** Prepend a standard historical alert banner:
   ```markdown
   > [!WARNING]
   > **HISTORICAL / SUPERSEDED DOCUMENT**
   > This document is maintained for historical reference only. It has been superseded by the authoritative replacement indicated in `docs/AUTHORITATIVE_INDEX.md`.
   ```
2. **Map in Authoritative Index:** Add the mapping to Section 2.C of [`docs/AUTHORITATIVE_INDEX.md`](../../../docs/AUTHORITATIVE_INDEX.md).
3. **Preserve Recoverable Content:** Do not discard historical session records or reports. Move them to `docs/archive/` if necessary.

---

## 10. Benchmark Provenance and Versioning
Any benchmark specification (such as [`docs/benchmarks/plagiarism-benchmark-spec.md`](../../../docs/benchmarks/plagiarism-benchmark-spec.md)) must specify:
- Dataset version and provenance (e.g. `ISO-BUKSU-V1`, `PAN-SPANS-V1`).
- Expected labels and labeling rationale.
- Model hyperparameters ($w_{lex}, w_{sem}, \theta_{min}$).
- Evaluation procedure and scoring formulas.
- Disclaimer that mocked unit test runs do not represent empirical accuracy.

---

## 11. Structured Memory Validation & PTSS Healing
1. **RFC 8259 Compliance:** All `.json` and `.jsonl` files in `.agents/ptss/` must be strictly valid JSON.
2. **Regex Escapes:** Never leave raw regex backslashes (`\s`, `\d`) unescaped in JSON strings; always use `\\s`, `\\d`.
3. **Single-Line JSONL:** Ensure each line in `index.jsonl` contains exactly one JSON object terminated by a newline.
4. **No History Fabrication:** Never invent or forge missing timestamps or session IDs. Preserve original metadata during repair.

---

## 12. Explicit Negative Rules & Anti-Patterns
- ❌ **Age Alone Does Not Justify Deletion:** An older document or test that accurately reflects an institutional rule is valid; do not delete files simply because they were created months ago.
- ❌ **Historical Claims Do Not Certify Current Code:** A passed test recorded in an old session log does not prove the current working tree passes; always verify directly.
- ❌ **No Weakening Assertions:** Weakening a threshold from `< 25%` to `< 50%` or removing an error check to make tests green is strictly prohibited.
- ❌ **No Hallucinated Reconciliation:** If institutional requirements and code disagree, flag the item as `needs-review` in `classification-manifest.json` rather than guessing an answer.
- ❌ **No Unbounded Purges or Rewrites:** Never run wholesale file deletions or broad whole-file rewrites.

---

## 13. Verification Suite & Commands
To verify compliance with this skill:

```bash
# 1. Run the Workspace Evidence & Authority Verification Suite
npm run check:evidence

# 2. Check API Endpoint Parity
npm run check:endpoints

# 3. Check Agentic Governance System
npm run validate:agentic

# 4. Check Governance Communication DAG
npm run validate:governance
```
