#!/usr/bin/env bash
# PreToolUse hook — matcher: Write|Edit|MultiEdit
# Adapted from the company's ai-ready-react-template's check-no-div-span.sh, which
# blocks ALL <div>/<span> use. That blanket rule is wrong for Angular: div/span are
# normal, correct choices for pure layout/grouping in every template framework.
# What Angular's own accessibility guidance (.claude/rules/accessibility.md) actually
# objects to is narrower and more specific: a div/span given INTERACTIVE semantics
# (a click handler, a manually-added tabindex) instead of a real <button>/<a>, which
# loses keyboard/focus/ARIA behavior a native element gets for free. This hook checks
# for exactly that narrower, real problem.

set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$FILE_PATH" in
  *.html) ;;
  *) exit 0 ;;
esac

if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

# Look for a <div or <span tag that also carries (click), tabindex, (keydown), or
# (keyup) on the same tag — i.e. hand-rolled interactivity on a non-interactive element.
VIOLATIONS=$(echo "$CONTENT" | grep -nE '<(div|span)\b[^>]*(\(click\)|tabindex|\(keydown|\(keyup)' || true)

if [ -n "$VIOLATIONS" ]; then
  echo "BLOCKED: interactive <div>/<span> detected in $FILE_PATH." >&2
  echo "Violations:" >&2
  echo "$VIOLATIONS" >&2
  echo "" >&2
  echo "Rule: a clickable/keyboard-interactive element should be a real <button> or <a>," >&2
  echo "not a <div>/<span> with (click)/tabindex bolted on — those lose keyboard, focus," >&2
  echo "and screen-reader behavior a native element gets for free." >&2
  echo "Source: .claude/rules/accessibility.md" >&2
  exit 2
fi

exit 0
