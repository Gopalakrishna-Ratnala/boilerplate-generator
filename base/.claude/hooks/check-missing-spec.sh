#!/usr/bin/env bash
# PostToolUse hook — matcher: Write
# Warns (non-blocking): a new component/service/pipe/guard/directive file has no
# co-located .spec.ts yet. Ported directly from the company's ai-ready-angular-template
# reference template — no adaptation needed.

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
  echo "WARNING: no co-located spec found for $FILE_PATH (expected $SPEC_PATH)." >&2
  echo "Source: .claude/rules/angular.md — every component, service, and pipe needs a test." >&2
fi

exit 0
