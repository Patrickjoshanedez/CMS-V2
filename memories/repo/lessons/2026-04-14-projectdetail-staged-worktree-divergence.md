# 2026-04-14: ProjectDetail staged/worktree divergence

- Symptom: UI appeared reverted even after targeted repair; file showed `MM` in `git status`.
- Root cause: index (staged) and worktree versions diverged, creating flip-flop diffs and misleading review state.
- Prevention rule: after emergency syntax/content recovery, always run:
  - `git status --short -- <file>`
  - `git diff -- <file>`
  - `git diff --staged -- <file>`
- If file is `MM`, normalize immediately (`git restore --staged -- <file>` or explicit re-stage of intended version) before further edits.
