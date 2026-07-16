#!/usr/bin/env bash
# PostToolUse hook — matcher: Write|Edit|MultiEdit
# Runs `tsc --noEmit` after edits to .ts files and warns (non-blocking) on type
# errors. Debounced to 30s so rapid sequential edits don't each trigger a full
# project type-check. Adapted from a pattern found in the company's
# ai-ready-react-template — same underlying idea (surface type errors immediately,
# not just at CI/build time), adapted for Angular's tsconfig layout.

set -uo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts) ;;
  *) exit 0 ;;
esac

case "$FILE_PATH" in
  *.spec.ts) exit 0 ;;
esac

PROJECT_DIR="$(pwd)"
if [ ! -f "${PROJECT_DIR}/tsconfig.json" ]; then
  exit 0
fi

STAMP_FILE="/tmp/.claude-tsc-last-run-$(echo "$PROJECT_DIR" | md5sum 2>/dev/null | cut -d' ' -f1)"
if [ -f "$STAMP_FILE" ]; then
  LAST_RUN=$(cat "$STAMP_FILE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  ELAPSED=$((NOW - LAST_RUN))
  if [ "$ELAPSED" -lt 30 ]; then
    exit 0
  fi
fi
date +%s > "$STAMP_FILE" 2>/dev/null

TSC_OUTPUT=$(npx tsc --noEmit 2>&1)
TSC_EXIT=$?

if [ "$TSC_EXIT" -ne 0 ]; then
  ERROR_COUNT=$(echo "$TSC_OUTPUT" | grep -c "error TS" || true)
  ERROR_LINES=$(echo "$TSC_OUTPUT" | grep "error TS" | head -15)
  MESSAGE="WARNING: TypeScript type check found ${ERROR_COUNT} error(s).
${ERROR_LINES}"
  if [ "$ERROR_COUNT" -gt 15 ]; then
    MESSAGE="${MESSAGE}
... and $((ERROR_COUNT - 15)) more error(s). Run 'npx tsc --noEmit' to see all."
  fi
  # CORRECTED mechanism (session-29's exit-1 fix was itself wrong — see
  # check-missing-spec.sh for the full explanation). Claude Code only processes
  # JSON on exit 0, and only additionalContext inside hookSpecificOutput reliably
  # reaches Claude's own context for a PostToolUse hook — plain stderr text on a
  # non-zero exit does not. Always exit 0; the JSON output is what carries the
  # warning now, not the exit code.
  jq -n --arg msg "$MESSAGE" '{
    "hookSpecificOutput": {
      "hookEventName": "PostToolUse",
      "additionalContext": $msg
    }
  }'
fi

exit 0
