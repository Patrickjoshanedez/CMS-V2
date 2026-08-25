---
name: skill-write-or-patch
description: >
  Fires during agent execution when a recurring pattern, missing capability, or improvable skill is detected.
  Use to write a brand-new SKILL.md or surgically patch an existing one inside .agents/skills/.
  Triggers on: "write a skill for this", "patch the skill", "this keeps coming up", "add this to the skill",
  "we should capture this", "save this pattern", "make this reusable", "skill gap detected",
  "this pattern is missing from our skills", or whenever the agent notices it has solved the same
  sub-problem twice without a skill backing it. Always archives the event to PTSS afterward.
---

# Skill Write or Patch

This skill fires mid-execution when a knowledge gap or improvement opportunity surfaces. It prevents repeated rediscovery of the same solution by persisting it as a skill — either brand-new or as a surgical patch to an existing one.

## Decision Tree: Write vs Patch

Before doing anything, answer these two questions:

1. **Does a skill already exist that covers this domain?**
   - Check `.agents/skills/` for a matching skill directory.
   - If yes → **Patch** the existing SKILL.md.
   - If no → **Write** a new skill.

2. **Is this a one-off fix or a repeatable pattern?**
   - One-off (unique context, unlikely to recur) → skip; don't pollute the skill ecosystem.
   - Repeatable pattern → proceed with write or patch.

---

## WRITE: Creating a New Skill

### 1. Name and Place It
```
.agents/skills/<kebab-case-name>/
├── SKILL.md          ← required
└── scripts/          ← optional, for reusable helper scripts
```

### 2. SKILL.md Frontmatter Template
```yaml
---
name: <kebab-case-name>
version: 1.0.0
schema-version: 1
description: >
  <What this skill enables the agent to do. When to trigger it.
  Be slightly pushy — list concrete trigger phrases so the agent
  actually invokes this skill instead of reinventing it.>
---
```

### 3. Body Structure
Keep the body under 400 lines. Use these sections as needed:

```markdown
# <Skill Title>

Brief one-paragraph description of purpose and value.

## When To Use
- Concrete trigger conditions (not just keywords — describe context)

## Core Workflow
Numbered steps. Use imperative voice. Explain the *why* behind each step.

## Patterns & Examples
Show input → output examples for the most common cases.

## CMS-V2 Specifics
Any workspace-specific paths, conventions, or integration points relevant to this skill.

## Failure Recovery
What to do if the workflow breaks at each major step.
```

### 4. Register in workspace-rules.md
After creating the skill, add its name to the skill ecosystem map in
`.agents/rules/workspace-rules.md` under the appropriate category bucket.

---

## PATCH: Updating an Existing Skill

### 1. Read the Current Skill
View the existing SKILL.md fully before touching it. Never overwrite the whole file.

### 2. Identify the Exact Gap
Pinpoint the specific section(s) that are missing or wrong:
- Missing trigger phrase in `description`?
- Missing workflow step?
- Outdated path or API reference?
- Missing CMS-V2 specific guidance?

### 3. Apply a Surgical Patch
Use `multi_replace_file_content` or `replace_file_content` targeting only the affected lines.
Preserve all existing developer comments, examples, and structure around the patched section.

### 4. Bump the Version
Increment the `version` field in frontmatter:
- New section or significant addition → bump minor (`1.0.0` → `1.1.0`)
- Typo fix or small clarification → bump patch (`1.0.0` → `1.0.1`)

---

## Post-Action: Archive to PTSS

After every write or patch, record the event using the `ptss` skill:

```json
{
  "event": "skill_write" | "skill_patch",
  "skill_name": "<name>",
  "trigger_context": "<what task/problem revealed this gap>",
  "change_summary": "<one sentence: what was added or fixed>"
}
```

This ensures the hermes-curator can track skill provenance and the next session can retrieve what was learned.

---

## Quality Bar

A written or patched skill must pass this checklist before archiving:

- [ ] `name` and `description` frontmatter are present and non-generic
- [ ] Description includes at least 3 concrete trigger phrases
- [ ] Body explains *why* each step matters, not just *what* to do
- [ ] CMS-V2 specific paths/conventions are referenced where relevant
- [ ] No hardcoded secrets, env values, or user-specific paths
- [ ] Under 400 lines (if longer, split into skill + `references/` files)
