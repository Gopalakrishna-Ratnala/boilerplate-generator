#!/usr/bin/env bash
# PreToolUse hook — matcher: Write|Edit|MultiEdit
# Enforces: never mix @Input()/@Output() decorators with input()/output()/model()
# signals in the same component (angular.md — "use input()/output() functions, not
# decorators"). Ported directly from the company's ai-ready-angular-template
# reference template — already Angular-specific, no adaptation needed.

set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$FILE_PATH" in
  *.ts) ;;
  *) exit 0 ;;
esac
case "$FILE_PATH" in
  *.spec.ts) exit 0 ;;
esac

if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

HAS_DECORATOR=$(echo "$CONTENT" | grep -cE '@Input\(|@Output\(' || true)
HAS_SIGNAL=$(echo "$CONTENT" | grep -cE '=\s*(input|output|model)(\.required)?(<[^>]*>)?\(' || true)

if [ "$HAS_DECORATOR" -gt 0 ] && [ "$HAS_SIGNAL" -gt 0 ]; then
  echo "BLOCKED: $FILE_PATH mixes @Input()/@Output() decorators with input()/output()/model() signals." >&2
  echo "Pick one style for this component — never both." >&2
  echo "Source: .claude/rules/angular.md" >&2
  exit 2
fi

exit 0
