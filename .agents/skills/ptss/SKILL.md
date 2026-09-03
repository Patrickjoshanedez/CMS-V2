---
name: ptss
version: 1.0.0
schema-version: 1
description: >
  Persistent Transcript Session State — archive and retrieve structured session records for the CMS-V2 agent.
  Use to save a session snapshot after any meaningful task (saves to .agents/ptss/sessions/),
  or to retrieve prior session context at the start of a new session.
  Triggers on: "archive this session", "save session state", "what did we do last time",
  "retrieve prior context", "session recall", "what skills did we use", "continue from last session",
  "PTSS archive", "PTSS retrieve", or automatically at the end of any skill-write-or-patch event.
---

# PTSS — Persistent Transcript Session State

PTSS gives the agent persistent memory across sessions. Instead of starting cold every time, the agent can retrieve structured records of past tasks, decisions, and skill mutations — and build on them rather than rediscovering the same ground.

---

## Session File Format

Sessions are stored as individual JSON files:
```
.agents/ptss/sessions/YYYY-MM-DD_<task-slug>.json
```

**Schema:**
```json
{
  "session_id": "YYYY-MM-DD_<task-slug>",
  "date": "ISO-8601 timestamp",
  "task_summary": "One sentence: what was accomplished",
  "task_category": "feature | fix | refactor | skill | infra | research",
  "files_modified": ["relative/path/to/file"],
  "skills_triggered": ["skill-name-1", "skill-name-2"],
  "skills_written": ["new-skill-name"],
  "skills_patched": [
    { "name": "existing-skill", "change": "Added CMS-V2 Mongoose pattern for soft-delete" }
  ],
  "key_decisions": [
    "Used TanStack Query optimistic update pattern instead of manual refetch"
  ],
  "lessons_learned": [
    "BullMQ job IDs must be unique per queue — collision silently drops the job"
  ],
  "open_threads": [
    "Auth token refresh flow not yet tested under concurrent requests"
  ],
  "verification_status": "passed | partial | skipped",
  "verification_notes": "npm test --workspace=server exited 0"
}
```

---

## ARCHIVE: Saving a Session

Run at the end of any meaningful task — especially after a skill-write-or-patch event.

### Step 1: Derive the task slug
Convert the task summary to kebab-case, max 6 words:
- "Add soft-delete to Project model" → `add-soft-delete-project-model`
- "Fix BullMQ job collision bug" → `fix-bullmq-job-collision`

### Step 2: Build the session JSON
Fill every field. For empty arrays, use `[]`. Be concrete in `lessons_learned` and `key_decisions` — vague entries ("things went well") are useless on retrieval.

### Step 3: Write the file
```
.agents/ptss/sessions/<YYYY-MM-DD>_<task-slug>.json
```

Do not overwrite existing session files. If the same slug exists for today, append `-2`, `-3`, etc.

### Step 4: Update the index
Append one line to `.agents/ptss/index.jsonl`:
```jsonl
{"session_id": "<id>", "date": "<ISO>", "task_summary": "<summary>", "task_category": "<cat>", "skills_written": [...], "skills_patched": [...]}
```
This line-per-record index lets future sessions grep for relevant context without reading every full session file.

---

## RETRIEVE: Loading Prior Context

Run at the start of a session when continuity matters, or when a prior session is referenced.

### Step 1: Grep the index
Search `.agents/ptss/index.jsonl` for sessions matching the current task domain:
```powershell
Select-String -Path ".agents\ptss\index.jsonl" -Pattern "mongoose|project model|soft-delete"
```

### Step 2: Read the matching session file(s)
Load only the 1-3 most relevant sessions. Avoid loading everything — context budget matters.

### Step 3: Inject into working context
Summarize retrieved context into a brief "Prior Context" block at the start of your execution plan:
```
## Prior Context (from PTSS)
- [2026-08-20] Added soft-delete to User model. Lesson: always add `deleted_at` index.
- [2026-08-22] Patched mongoose-mongodb skill with soft-delete pattern.
```

### Step 4: Surface open threads
Check `open_threads` from retrieved sessions. If any are relevant to the current task, address them proactively.

---

## CMS-V2 Integration Points

- **Skills written/patched**: always log to PTSS via `skill-write-or-patch` — the curator reads these logs to compute skill activity scores.
- **Verification status**: always record whether `npm test` / `npm run validate:agentic` passed.
- **Files modified**: use paths relative to workspace root (e.g., `server/modules/projects/project.model.js`).

---

## Maintenance

The index file (`.agents/ptss/index.jsonl`) is append-only. Never edit past entries. If a session needs correction, write a new session file with a `corrects` field pointing to the original session ID.
