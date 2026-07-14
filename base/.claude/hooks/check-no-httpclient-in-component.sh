#!/usr/bin/env bash
# PreToolUse hook — matcher: Write|Edit|MultiEdit
# Enforces: HttpClient is only injected/used inside a *.service.ts file — never
# directly in a component, directive, or guard (architecture.md: "New API service for
# one feature -> features/<feature>/services/"). A component should depend on a
# service, not on HttpClient directly.

set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$FILE_PATH" in
  *.ts) ;;
  *) exit 0 ;;
esac

# Already the right place for it — service files, interceptors (which necessarily
# work with HTTP requests/responses), and spec files (may need HttpClient for testing
# setup) are all fine.
case "$FILE_PATH" in
  *.service.ts|*.interceptor.ts|*.spec.ts) exit 0 ;;
esac

if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

VIOLATIONS=$(echo "$CONTENT" | grep -nE "HttpClient" || true)

if [ -n "$VIOLATIONS" ]; then
  echo "BLOCKED: direct HttpClient usage detected in $FILE_PATH." >&2
  echo "Violations:" >&2
  echo "$VIOLATIONS" >&2
  echo "" >&2
  echo "Rule: components/directives/guards should depend on a *.service.ts, never on" >&2
  echo "HttpClient directly. Move this call into the relevant feature's service." >&2
  echo "Source: .claude/rules/architecture.md" >&2
  exit 2
fi

exit 0
