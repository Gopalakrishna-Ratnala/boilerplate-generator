#!/usr/bin/env bash
# PreToolUse hook — matcher: Bash
#
# Single source of truth: reads the Bash() deny patterns directly from
# .claude/settings.json rather than keeping a separate hardcoded list.
# Adds a clear, educational error message on top of the native block.

set -euo pipefail

SETTINGS_FILE="$(dirname "$0")/../settings.json"
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ] || [ ! -f "$SETTINGS_FILE" ]; then
  exit 0
fi

# Extract the command glob out of "Bash(npm install*)" style entries.
PATTERNS=$(jq -r '.permissions.deny[] | select(startswith("Bash(")) | capture("\\((?<p>.*)\\)").p' "$SETTINGS_FILE")

shopt -s extglob
while IFS= read -r pattern; do
  [ -z "$pattern" ] && continue
  case "$COMMAND" in
    $pattern)
      echo "BLOCKED: command matches restricted pattern '$pattern' in .claude/settings.json." >&2
      echo "Command was: $COMMAND" >&2
      echo "Dependency changes, force-pushes, history rewrites, and raw network calls" >&2
      echo "are not allowed from this agent. Flag it to a developer instead." >&2
      exit 2
      ;;
  esac
done <<< "$PATTERNS"

exit 0
