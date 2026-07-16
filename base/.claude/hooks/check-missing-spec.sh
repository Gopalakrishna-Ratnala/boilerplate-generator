#!/usr/bin/env bash
# PostToolUse hook — matcher: Write
# Warns (non-blocking): a new component/service/pipe/guard/directive file has no
# co-located .spec.ts yet.
#
# CORRECTED exit-code/output mechanism (found via a real fresh Claude Code session
# testing this live — the session-29 "fix" of exiting 1 was itself wrong).
# Claude Code's own docs are explicit: "Claude Code only processes JSON on exit 0.
# If you exit 2, any JSON is ignored." For PostToolUse specifically, the way to
# actually inject a message into Claude's own context (not just a human's terminal)
# is exit 0 plus a JSON object on stdout with hookSpecificOutput.additionalContext —
# plain stderr text on a non-zero, non-2 exit code does NOT reliably reach Claude's
# context for this event type, confirmed by a real session where this exact hook's
# warning still didn't surface even after the exit-1 change. Exiting 1 was actually
# worse than exiting 0: it meant Claude Code wouldn't even parse JSON output if this
# script had included any, since JSON is only processed on exit 0.

set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ "$TOOL_NAME" != "Write" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts) ;;
  *) exit 0 ;;
esac

case "$FILE_PATH" in
  *.spec.ts|*.routes.ts|*.model.ts|*config*) exit 0 ;;
esac

SPEC_PATH="${FILE_PATH%.ts}.spec.ts"

if [ ! -f "$SPEC_PATH" ]; then
  MESSAGE="WARNING: no co-located spec found for $FILE_PATH (expected $SPEC_PATH). Source: .claude/rules/angular.md — every component, service, and pipe needs a test."
  jq -n --arg msg "$MESSAGE" '{
    "hookSpecificOutput": {
      "hookEventName": "PostToolUse",
      "additionalContext": $msg
    }
  }'
fi

exit 0
