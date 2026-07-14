#!/usr/bin/env bash
# PreToolUse hook — matcher: Write|Edit|MultiEdit
# Enforces: API endpoint paths/base URLs live in this project's config indirection
# (api.config.ts / graphql.config.ts / realtime.config.ts / oauth.config.ts, per the
# selected data-layer/auth bundle), never as string literals inline in a service.
# Adapted from the company's ai-ready-angular-template reference template — skip list
# updated to match this project's actual config file names instead of theirs.

set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$FILE_PATH" in
  *.service.ts) ;;
  *) exit 0 ;;
esac

# Skip this project's own config files — that's exactly where a base URL belongs.
case "$FILE_PATH" in
  *api.config.ts|*graphql.config.ts|*realtime.config.ts|*oauth.config.ts) exit 0 ;;
esac

if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

VIOLATIONS=$(echo "$CONTENT" | grep -nE "(http\.(get|post|put|patch|delete)|httpResource)[^;]*['\"](/api/|https?://)" || true)

if [ -n "$VIOLATIONS" ]; then
  echo "BLOCKED: hardcoded API path detected in $FILE_PATH." >&2
  echo "Violations:" >&2
  echo "$VIOLATIONS" >&2
  echo "" >&2
  echo "Rule: API endpoint paths/base URLs belong in this project's config indirection" >&2
  echo "(the selected data-layer/auth bundle's *.config.ts file), never as an inline" >&2
  echo "string literal in a service." >&2
  echo "Source: the selected data-layer bundle's rules file, .claude/rules/security.md" >&2
  exit 2
fi

exit 0
