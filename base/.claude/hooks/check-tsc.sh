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
  echo "WARNING: TypeScript type check found $ERROR_COUNT error(s)." >&2
  echo "$TSC_OUTPUT" | grep "error TS" | head -15 >&2
  if [ "$ERROR_COUNT" -gt 15 ]; then
    echo "... and $((ERROR_COUNT - 15)) more error(s). Run 'npx tsc --noEmit' to see all." >&2
  fi
  # Exit 1, not 0 — found via real testing that Claude Code silently discards a
  # PostToolUse hook's output on exit 0 (only reaches an internal debug log, never
  # the visible transcript). A "non-blocking warning" that always exits 0 is
  # actually invisible, not just non-blocking. Non-blocking AND visible requires a
  # non-zero, non-2 exit code.
  exit 1
fi

# Nothing to report — this is the genuine "no issue" case, exit 0 is correct here.
exit 0
