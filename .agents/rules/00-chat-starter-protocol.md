# 🚀 RULE 0: CHAT-STARTER PREFLIGHT & INITIALIZATION CONTRACT

**Target Platform:** BukSU Capstone Management System V2 (CMS-V2)  
**Priority:** Absolute Tier 0 (Must be evaluated and executed BEFORE chatting anything or taking action)  
**Compliance Standard:** ASDLC v2.0 Stage 0 Preflight Mandatory Prerequisite  

---

## 1. THE SUPREME FIRST-ORDER DIRECTIVE (RULE 0)

> [!IMPORTANT]
> **ABSOLUTE FIRST RULE**: Before generating conversational responses, planning solutions, modifying code, or invoking tools, the agent **MUST ALWAYS** check for and ensure the creation of the active **Chat-Starter Snapshot File**. No conversation or task execution may proceed without an established chat-starter context.

---

## 2. CHAT-STARTER SPECIFICATION & ATOMIC SCHEMA

The canonical chat-starter state file lives at:
```
.agents/ptss/chat-starter.json
```
*(Fallback location if `.agents/ptss/` is write-locked: `scratch/chat-starter.json`)*

### Canonical Chat-Starter Schema (JSON)
```json
{
  "$schema": "https://cms.buksu.edu.ph/schemas/chat-starter.schema.json",
  "version": "2.1.0",
  "session_id": "YYYY-MM-DD_<task-slug>",
  "timestamp": "ISO-8601 UTC Timestamp",
  "status": "initialized",
  "role": "Master Systems Architect & Apex Cognitive Agent (BukSU CMS-V2 Orchestrator)",
  "compliance_standard": "ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]",
  "git_context": {
    "active_branch": "main",
    "clean_working_tree": true
  },
  "asdlc_phase": "STAGE 0: STARTUP PREFLIGHT",
  "startup_preflight": {
    "ptss_index_inspected": true,
    "technical_context_synced": true,
    "recent_sessions_recalled": [
      "YYYY-MM-DD_previous-session-1",
      "YYYY-MM-DD_previous-session-2"
    ],
    "active_prevention_rules_count": 48
  },
  "skills_primed": [
    "anti-regression-and-ci-governance",
    "verification-loop",
    "continual-learning",
    "skill-write-or-patch"
  ],
  "playwright_feedback_required": false,
  "verification_baseline": {
    "governance_passed": true,
    "workspace_clean": true
  },
  "supreme_cognitive_protocols": {
    "kernel_engineering_standard": {
      "keep_it_simple": "Zero AI slop, no unvetted dependencies, no premature abstractions.",
      "easy_to_verify": "Every modification accompanied by targeted assertion suites.",
      "reproducible_results": "Deterministic, environment-agnostic execution across dev and Docker.",
      "narrow_scope": "Solve the exact problem without accidental drift or collateral modifications.",
      "explicit_constraints": "Strict TypeScript/Zod/Mongoose validation, role boundaries, and error boundaries.",
      "logical_structure": "Concrete Semantic Tree (CST) precision patching preserving existing JSDocs and developer comments."
    },
    "cognitive_vulnerability_guards": {
      "execution_signal_dominance": "Zero hope-driven development. Run isolated 10-line scratchpad tests in scratch/ before touching target codebase files.",
      "session_startup_recall": "Inspect index.jsonl (latest 2-3 sessions) and memories/repo/CMS-V2-Technical-Context.md.",
      "three_cycle_break_rule": "If a fix fails two consecutive test iterations, STOP. Revert baseline and inject diagnostic tracers.",
      "mutation_testing": "Assert negative boundaries and synthetic mutation failures."
    },
    "canonical_capstone_progression": {
      "phase_0": "Team Formation & Roster Locking (2-4 members, 5 proponent roles, locked via PATCH /api/teams/:id/lock, Instructor assigns committee).",
      "phase_1": "Capstone 1 (Title Defense & Proposal Pre-Scan, 1..10 proposals, SDG 1..17, cosine similarity pre-scan, proposal defense rubric approval).",
      "phase_2": "Capstone 2 (Chapters 1-3 Manuscript & Midterm Defense, plagiarism scan <25%, oral defense, ADM v1 sign-off).",
      "phase_3": "Capstone 3 (System Development & Progress Defense, 4-section Interactive Gantt Chart, isLate gating, Chapters 4 & 5, progress demo, ADM v2 sign-off).",
      "phase_4": "Capstone 4 (Final Defense, Multi-Tier ADM Sign-Off strictly gated by Secretary Compliance Verification Endorsement, S3/MinIO archival, sealed completion certificate PDF)."
    },
    "institutional_role_boundaries": {
      "primary_roles": ["student", "instructor", "faculty"],
      "instructor_committee_exclusion": "Course Instructors (role: 'instructor') are strictly prohibited from serving on capstone committees.",
      "committee_appointments": "Reserved strictly for Faculty (role: 'faculty', adviser, panelist): 1 Adviser, 1 Secretary, 3 Panelists (Lead/Chair, Member, Panel Member 3).",
      "secretary_adm_gate": "project.admSignatures.secretary.endorsed === true is an immutable prerequisite before Tier 1/2/3 committee digital signatures can unlock."
    },
    "ihsa_architecture": {
      "in_process_sequential_execution": "hooks_dispatcher.py with sys.modules caching (<100ms execution).",
      "dynamic_buffer_static_gatekeeper": "PreToolUse gatekeeping checks virtual patch buffers; zero deadlocks.",
      "declarative_feature_policies": ".github/hooks/state/feature_policies.json.",
      "provider_agnostic_cloud_ai_runtime": "DeepSeek API (deepseek-chat via https://api.deepseek.com).",
      "modular_lifecycle_gates": ["test_tracking_gate.py", "public_exposure_gate.py", "completion_keyword_guard.py"]
    },
    "asdlc_v2_execution_lifecycle": [
      "STAGE 0: STARTUP PREFLIGHT",
      "STAGE 1: INTENT DECOMPOSITION & SKILL LOOKUP",
      "STAGE 2: TARGETED CONTEXT GATHERING",
      "STAGE 3: STRUCTURAL INSPECTION",
      "STAGE 4: STATECHART-DRIVEN ORCHESTRATION",
      "STAGE 5: SURGICAL CST EDITING",
      "STAGE 6: DETERMINISTIC VERIFICATION",
      "STAGE 7: HUMAN-IN-THE-LOOP (HITL) GATING",
      "STAGE 8: FIX AUDITING & DUAL-PERSISTENCE ARCHIVAL"
    ],
    "deterministic_quality_gate_battery": [
      "1. npm run check:endpoints (196 Server / 175 Client, UNMATCHED_COUNT = 0)",
      "2. npm run validate:agentic (60/60 checks passed)",
      "3. npm run validate:governance (All 4 stages valid, 0 errors, 0 warnings)",
      "4. npm test --workspace=client (Frontend unit & institutional fidelity tests)",
      "5. npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js",
      "6. python scripts/workspace_guardrail.py (Pristine workspace, zero cognitive clutter)",
      "7. Playwright Visual Audit Gate (Mandatory for client UI/UX modifications: node scratch/<feature>_audit.mjs)"
    ],
    "dual_persistence_memory_continuity": {
      "session_trajectory": ".agents/ptss/sessions/YYYY-MM-DD_<task-slug>.json",
      "session_index": ".agents/ptss/index.jsonl",
      "technical_context": "memories/repo/CMS-V2-Technical-Context.md",
      "required_post_mortem_keywords": ["lesson", "learned", "prevention", "runbook", "checklist", "evidence", "passed"]
    },
    "output_contract_template": {
      "stage_indicator": "SYSTEM STATUS: BOUNDED BY ASDLC [v2.0] | STAGE: [Current Stage]",
      "sections": [
        "<hypothesis_proof>: Programmatic verification, test output, or mathematical proof.",
        "<architectural_blueprint>: Mermaid diagram mapping data flow or statechart transition.",
        "<execution_directives>: Surgical CST patches, modified files, and systemic justification."
      ]
    }
  }
}
```

---

## 3. CHAT-STARTER EXECUTION PROTOCOL (STEP-BY-STEP)

Whenever a new turn, chat conversation, or user instruction begins:

### Step 1: Pre-Execution State Probe
1. Check if `.agents/ptss/chat-starter.json` exists.
2. Read the file content. If the file is absent, empty, or references an older completed session:
   - Proceed immediately to **Step 2: Atomic Creation**.
3. If the file exists and represents the active task, verify that `status` is either `"initialized"` or `"active"`.

### Step 2: Atomic Creation & Context Priming
1. Generate the session ID using the current date and user intent slug (`YYYY-MM-DD_<slug>`).
2. Read the latest 2–3 entries from `.agents/ptss/index.jsonl` to establish memory continuity.
3. Review `memories/repo/CMS-V2-Technical-Context.md` to load active prevention rules.
4. Query the **Skills Dictionary** (`.agents/skills/`) to prime matching skills based on the user request.
5. Set `playwright_feedback_required: true` if the task touches UI, UX, styling (`client/src/`), or design tokens.
6. Write `.agents/ptss/chat-starter.json` to disk.

### Step 3: Confirmation Gate
Only after `.agents/ptss/chat-starter.json` exists and is confirmed valid may the agent:
- Emit its Stage 0 Preflight acknowledgment.
- Progress to Stage 1 (Intent Decomposition) and Stage 2 (Context Gathering).
- Take any tool actions or write code.

---

## 4. AUDIT & POST-TASK SYNCHRONIZATION

When the task reaches Stage 8 (Task Closure):
1. Update `status: "completed"` in `.agents/ptss/chat-starter.json`.
2. Persist the full execution trajectory to `.agents/ptss/sessions/YYYY-MM-DD_<slug>.json`.
3. Append the completion record to `.agents/ptss/index.jsonl`.
4. Codify any newly discovered lessons or skill gaps into `memories/repo/CMS-V2-Technical-Context.md` and `.agents/skills/<target-skill>/SKILL.md`.
