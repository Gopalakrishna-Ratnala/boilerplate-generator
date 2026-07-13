#!/usr/bin/env bash
# PreToolUse hook — matcher: Write|Edit|MultiEdit
#
# Single source of truth: this hook reads the Write()/Edit() deny patterns
# directly from .claude/settings.json rather than keeping its own copy.
# Its only added value over the native deny rule is a clear, educational
# error message — the protected-path LIST itself lives in exactly one file.

set -euo pipefail

SETTINGS_FILE="$(dirname "$0")/../settings.json"
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ] || [ ! -f "$SETTINGS_FILE" ]; then
  exit 0
fi

# Extract the path glob out of "Write(./foo/**)" / "Edit(./foo.json)" style entries.
PATTERNS=$(jq -r '.permissions.deny[] | select(startswith("Write(") or startswith("Edit(")) | capture("\\((?<p>.*)\\)").p' "$SETTINGS_FILE")

shopt -s globstar nullglob extglob
while IFS= read -r pattern; do
  [ -z "$pattern" ] && continue
  # Normalize "./x" style patterns for a simple substring/glob comparison.
  clean_pattern="${pattern#./}"
  clean_file="${FILE_PATH#./}"
  case "$clean_file" in
    $clean_pattern)
      echo "BLOCKED: '$FILE_PATH' matches a protected pattern ('$pattern') in .claude/settings.json." >&2
      echo "This file is off-limits to the AI agent per .claude/rules/security.md." >&2
      echo "If this change is genuinely needed, flag it to a developer instead of editing it directly." >&2
      exit 2
      ;;
  esac
done <<< "$PATTERNS"

exit 0
