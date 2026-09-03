---
name: context-gathering-and-ast-triage
version: 1.0.0
schema-version: 1
description: >
  High-performance context gathering, AST/CST triage, caller-callee chain mapping,
  and bounded code inspection patterns for CMS-V2. Use to accelerate token-efficient
  discovery, eliminate context compaction errors, prevent hallucinated imports, and
  ensure surgical code modifications across monorepo layers.
  Triggers on: "context gathering", "ast triage", "efficient coding", "find symbol",
  "navigate codebase", "trace call chain", "targeted search", "prevent hallucination",
  "cognitive efficiency", "code navigation".
---

# Context Gathering & AST Triage Skill (CMS-V2)

This skill provides deterministic patterns for fast, accurate context discovery and surgical code editing in the BukSU Capstone Management System V2 monorepo.

---

## 1. The Core Efficiency Directives

To maximize coding velocity and prevent context compaction:

1. **Index-First Discovery**: Always query repository maps first:
   - [FILES_INDEX.md](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/FILES_INDEX.md) for module architectures and endpoint summaries.
   - [package.json](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/package.json) for workspace scripts, dependencies, and test flags.
   - [shared/src/](file:///c:/Users/patri/OneDrive/Desktop/Holy%20folder/CMS-V2/shared/) for canonical role enums (`ROLES`, `PANEL_ROLES`, `CAPSTONE_PHASES`).

2. **Bounded Line-Slice Views**:
   - Never dump entire files (>100 lines) into the context window.
   - Use `grep_search` to find exact symbol declarations.
   - Use `view_file` with targeted `StartLine` and `EndLine` ranges ($\le 100$ lines).

3. **Concrete Syntax Tree (CST) Surgical Patching**:
   - Never overwrite complete files for localized edits.
   - Target exact coordinate ranges and replace only the target AST nodes.
   - Preserve all existing developer comments, JSDoc headers, and whitespace styles.

---

## 2. End-to-End Caller-Callee Trace Matrix

When investigating or implementing features, trace across the 6 architectural layers:

```
[Layer 1: React Component]
  client/src/components/<module>/<Component>.jsx
       │
       ▼
[Layer 2: State / Store Hook]
  client/src/stores/<store>.js OR useQuery / useMutation
       │
       ▼
[Layer 3: Client API Service]
  client/src/services/<service>.service.js (verify path parity)
       │
       ▼ (HTTP REST)
[Layer 4: Express Router & Auth Middleware]
  server/modules/<module>/<module>.routes.js + authorize(roles)
       │
       ▼
[Layer 5: Controller & Business Logic]
  server/modules/<module>/<module>.controller.js & <module>.service.js
       │
       ▼
[Layer 6: Mongoose Model & Soft-Delete]
  server/modules/<module>/<module>.model.js + softDeletePlugin
```

---

## 3. Anti-Hallucination Import Checklist

Before referencing any symbol or dependency:
- **Lucide Icons**: Verify valid export in `lucide-react` (e.g. `CheckCircle2`, `Clock`, `ShieldCheck`).
- **Shared Constants**: Import from `@cms/shared` (`ROLES`, `PANEL_ROLES`, `TITLE_STATUSES`).
- **Endpoint Parity**: Ensure every client service method matches an active server route verified by `npm run check:endpoints`.

---

## 4. Pre-Completion Quality Gate Battery

Always verify modifications through the 6-point verification sequence:

```bash
npm run check:endpoints
npm run validate:agentic
npm run validate:governance
npm test --workspace=client
npm test --workspace=server -- tests/integration/comprehensive-all-workflows.test.js
python scripts/workspace_guardrail.py
```
