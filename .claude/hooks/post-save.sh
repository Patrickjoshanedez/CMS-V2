#!/usr/bin/env bash
# .claude/hooks/post-save.sh
# Event-driven visual verification hook triggered on file save

CHANGED_FILE="${1:-$FILE_PATH}"

# Only trigger on frontend UI/styling files
if [[ "$CHANGED_FILE" =~ \.(tsx|jsx|vue|css|html)$ ]]; then
  echo "[frontend-mythos] Frontend file modified: $CHANGED_FILE"
  echo "[frontend-mythos] Triggering Playwright visual verification harness..."

  TARGET_URL="${DEV_SERVER_URL:-http://localhost:3000}"
  ARTIFACT_DIR="./.claude/artifacts/visual-feedback"

  # Execute headless Playwright verification runner
  if [ -f ".claude/skills/frontend-mythos/scripts/visual-verify.ts" ]; then
    npx tsx .claude/skills/frontend-mythos/scripts/visual-verify.ts "$TARGET_URL" "$ARTIFACT_DIR"
  elif [ -f ".agents/skills/frontend-mythos/scripts/visual-verify.ts" ]; then
    npx tsx .agents/skills/frontend-mythos/scripts/visual-verify.ts "$TARGET_URL" "$ARTIFACT_DIR"
  fi
fi
