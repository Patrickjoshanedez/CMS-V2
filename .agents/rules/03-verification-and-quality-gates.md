# 🧪 DETERMINISTIC VERIFICATION, TESTING & QUALITY GATES RECIPE

**Rule File:** `.agents/rules/03-verification-and-quality-gates.md`  
**Parent Blueprint:** [workspace-rules.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/.agents/rules/workspace-rules.md)  
**Compliance Standard:** ASDLC [v2.0] & Supreme Cognitive Protocols [v2.1]  

---

## 1. FAST-PATH TARGETED TESTING (ZERO-LAG FEEDBACK)

Running the full 43+ test suites (~90–120s on Windows) during iterative implementation exhausts token budgets and triggers watchdog timeouts. Agents and developers **MUST** use **Targeted Testing** during iterative development:

```bash
# Targeted Client Test (runs in 1–5 seconds)
npm test --workspace=client -- <path-to-test-file>

# Examples:
npm test --workspace=client -- src/pages/projects/CreateProjectPage.test.jsx
npm test --workspace=client -- src/components/projects/AlignmentSelectorDialog.test.jsx
npm test --workspace=client -- src/components/projects/

# Targeted Server Unit or Integration Test (runs in 1–4 seconds):
npm test --workspace=server -- tests/unit/<module>.test.js
```

---

## 2. UNIFIED 7-POINT QUALITY GATE BATTERY

Before declaring any implementation task complete, agents **MUST** execute and pass the unified 7-point battery with zero errors:

```bash
# 1. API Route Parity Check (196 Server / 175 Client, UNMATCHED_COUNT = 0)
npm run check:endpoints

# 2. Agentic System Governance Audit (60/60 checks)
npm run validate:agentic

# 3. Agent Communication & Governance Pipeline (4 stages valid, 0 errors)
npm run validate:governance

# 4. React Frontend Unit & Store Test Suite
# Fast-path during iteration; full suite on final sign-off:
npm test --workspace=client

# 5. Express Backend 13-Stage Comprehensive Workflow Tests
npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js

# 6. Workspace Cleanliness Guardrail Linter
python scripts/workspace_guardrail.py

# 7. Playwright Visual Audit Gate (Mandatory for client UI/UX modifications)
node scratch/<feature>_audit.mjs
```

---

## 3. PLAYWRIGHT VISUAL FEEDBACK LOOP (STRICT DESIGN RULE)

All UI, UX, styling, component, and layout modifications in `client/src/` **MUST** execute a Playwright visual feedback script in `scratch/` across:
* **Desktop Viewport**: 1440 × 900 (Forced Light Mode & Dark Mode)
* **Mobile Viewport**: 390 × 844 (Forced Light Mode & Dark Mode)
* **Audit Checks**: Inspect rendered output for layout shifts, clipping, text truncation, dark mode token contrast (`text-foreground`, `bg-background`), and responsiveness before declaring completion.

---

## 4. GIT POST-COMMIT TAGGING & AUTOMATED VERSIONING

Automated semantic tagging is managed via `scripts/git-auto-tag.py` (`.husky/post-commit`):

| Commit Message Flag | Action Taken | Target Version Transition |
| :--- | :--- | :--- |
| **`feat: [major] ...`** | Increments Major version, resets minor/patch | `v1.1.0` $\rightarrow$ `v2.0.0` |
| **`feat: [minor] ...`** | Increments Minor version, resets patch | `v1.0.0` $\rightarrow$ `v1.1.0` |
| **`fix: ...` (default)** | Increments Patch version | `v1.1.0` $\rightarrow$ `v1.1.1` |

* **Double-Tag Protection**: The tagging engine parses HEAD; if the commit already carries a semantic tag, the tag operation is skipped to prevent infinite git loop pipelines.

---

## 5. RUNAWAY WATCHDOGS & INFINITE LOOP CONTAINMENT

To protect token consumption and pipeline resources, execution is actively monitored:
* **Max Iterations**: Hard capped at **15 turns**.
* **Max Time**: Strict **300-second (5-minute)** wall-clock timeout.
* **State-Hashing Watchdog**: Generates a SHA-256 hash across the serialized message trajectory and filesystem states at every turn. If a matching hash is discovered in execution history, immediate abort is triggered.

---

## 6. HUMAN-IN-THE-LOOP (HITL) GATES

High-consequence actions must pause and request explicit human verification:
1. **Database Seeding**: Scripts modifying standard catalog records (`server/seeders/*`).
2. **Production Releases**: Pushing tags beyond the major version line.
3. **ADM Signatures**: Applying final digital signature hashes to the Action Done Matrix.
