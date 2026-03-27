# Continual-Learning Hook

## Purpose
This hook enforces a post-task continual-learning checkpoint so learned practices remain codified.

## Files
- Hook registry: `.github/hooks/orchestrator-automation.json`
- Hook script: `.github/hooks/scripts/post_task_continual_learning.py`
- Skill file checked: `.agents/skills/continual-learning/SKILL.md`
- Acknowledgement checked: `.github/copilot-instructions.md`

## Versioning
- Hook registry version: `1.1.0`
- Hook registry schemaVersion: `1`
- Fallback skill wrappers now include:
  - `version: 1.1.0`
  - `schema-version: 1`

## Behavior
On post-task completion, the hook script outputs JSON with:
- `status`: `ok` or `warn`
- `skillFileExists`
- `instructionsFileExists`
- `acknowledgedInInstructions`

The registry is configured in warn mode (`failMode: warn`) to avoid blocking normal execution while still surfacing drift.

## Manual Run
From repo root:

```powershell
python .github/hooks/scripts/post_task_continual_learning.py
```
