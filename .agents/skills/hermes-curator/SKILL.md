---
name: hermes-curator
version: 1.0.0
schema-version: 1
description: >
  Hermes Curator — periodic skill lifecycle manager for CMS-V2.
  Audits .agents/skills/ for stale or unused skills, archives them reversibly,
  and can restore any archived skill with one command.
  Triggers on: "audit skills", "run hermes curator", "clean up skills",
  "which skills are stale", "skill lifecycle", "archive unused skills",
  "skill health check", "hermes audit", "curator run".
  Also patches active skills based on PTSS session lessons — nothing the curator
  does is irreversible.
---

# Hermes Curator

The curator keeps the skill ecosystem lean and active. It runs periodically to classify every skill by activity, moves stale ones to a reversible archive, and can patch active skills with lessons from PTSS session records.

**Nothing the Curator does is irreversible.** Every archive is a move, not a delete. Restore is one command.

---

## Skill Lifecycle States

```
Active  ──(30d no PTSS hits)──►  Stale  ──(14d more)──►  Archived
  ▲                                                           │
  └───────────────── restore (one command) ───────────────────┘
```

| State    | Location                          | Condition                          |
|----------|-----------------------------------|------------------------------------|
| Active   | `.agents/skills/<name>/`          | Used in a PTSS session within 30d  |
| Stale    | `.agents/skills/<name>/` + flag   | 30–44d since last PTSS hit         |
| Archived | `.agents/skills/.archived/<name>/`| 45d+ since last PTSS hit           |
| Restored | `.agents/skills/<name>/`          | Manually restored from archive     |

---

## Curator Workflow

### Phase 1: Audit (Deterministic — no LLM required)

Run the audit script to generate a staleness report:

```powershell
.venv\Scripts\python.exe .agents\skills\hermes-curator\scripts\audit_skills.py
```

This reads `.agents/ptss/index.jsonl`, computes last-used date per skill, and outputs:
```
.agents/ptss/audit_report.json
```

Review the report before taking any action. It shows each skill's state, last-used date, and triggered-by count.

### Phase 2: Snapshot (Before Every Pass)

Before archiving anything, snapshot the current skills manifest:
```powershell
Copy-Item .agents\skills -Destination ".agents\ptss\snapshots\$(Get-Date -Format 'yyyy-MM-dd')_skills_snapshot" -Recurse
```

This snapshot is the rollback point if anything goes wrong.

### Phase 3: Archive Stale Skills

For each skill flagged `archived` in the audit report:

1. Create the archive destination if it doesn't exist:
   ```powershell
   New-Item -ItemType Directory -Force ".agents\skills\.archived\<skill-name>"
   ```

2. Move the skill:
   ```powershell
   Move-Item ".agents\skills\<skill-name>" ".agents\skills\.archived\<skill-name>"
   ```

3. Write an archive record to `.agents/ptss/archive_log.jsonl`:
   ```jsonl
   {"action": "archived", "skill": "<name>", "date": "<ISO>", "last_used": "<ISO>", "reason": "45d+ unused"}
   ```

### Phase 4: Flag Stale Skills (Soft Warning)

For skills in the `stale` state (30–44d), add a `_STALE.md` marker file inside the skill directory:
```markdown
# ⚠️ STALE SKILL
Last used: <date>. Will be archived if not triggered within <N> days.
Delete this file to reset the stale clock (i.e. if you know the skill is still needed).
```

Do not modify the SKILL.md itself — only add the marker.

### Phase 5: Patch Active Skills (LLM Pass — up to 8 iterations)

For each skill classified `active`, check the PTSS session logs for any `skills_patched` entries that reference it. Apply those lessons using the `skill-write-or-patch` skill.

Curator constraints for the patch pass:
- Only touches agent-curated skills (those created via `skill-write-or-patch`)
- Never modifies bundled skills (those from global config plugins)
- Maximum 8 patch iterations per curator run to bound token spend
- Uses off-limits list: skills in `_CURATOR_SKIP` file are never touched

---

## Restore a Skill

To restore any archived skill:
```powershell
Move-Item ".agents\skills\.archived\<skill-name>" ".agents\skills\<skill-name>"
```

Then log the restore:
```jsonl
{"action": "restored", "skill": "<name>", "date": "<ISO>", "restored_by": "manual"}
```

No other steps required — the skill is immediately active again.

---

## Skip List

Create `.agents/skills/_CURATOR_SKIP` (one skill name per line) to permanently protect a skill from curation:
```
senior-backend
skill-write-or-patch
ptss
hermes-curator
verification-loop
```

Core infrastructure skills should always be in this list.

---

## Curator Constraints (Hard Rules)

1. **Never delete** — always move to `.archived/`, never `rm`.
2. **Snapshot before every pass** — rollback must always be possible.
3. **Double-tag guard** — if a skill was already archived this calendar week, skip it (prevent loop pipelines).
4. **Max 8 LLM iterations per run** — hard cap on patch iterations.
5. **Off-limits file respected** — `_CURATOR_SKIP` is read before any action.
6. **Log every action** — every archive, restore, and patch event goes to `archive_log.jsonl`.
