#!/usr/bin/env bash
# PreToolUse hook — matcher: Write|Edit|MultiEdit
# Enforces: every @for MUST include a track expression (angular.md).
# Ported from the company's ai-ready-angular-template reference template — this one
# was already Angular-specific, no adaptation needed beyond the source-file reference.

set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$FILE_PATH" in
  *.ts|*.html) ;;
  *) exit 0 ;;
esac

if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

VIOLATIONS=$(echo "$CONTENT" | grep -nE '@for\s*\(' | grep -v 'track' || true)

if [ -n "$VIOLATIONS" ]; then
  echo "BLOCKED: @for without a track expression detected in $FILE_PATH." >&2
  echo "Violations:" >&2
  echo "$VIOLATIONS" >&2
  echo "" >&2
  echo "Rule: every @for MUST include 'track'. Example: @for (item of items(); track item.id)" >&2
  echo "Source: .claude/rules/angular.md" >&2
  exit 2
fi

exit 0
