#!/usr/bin/env bash
# PreToolUse hook — matcher: Write|Edit|MultiEdit
# Adapted from the company's ai-ready-react-template's check-no-hardcoded-colors.sh.
# That version pointed to shadcn/ui-specific token names (bg-primary, text-foreground)
# because the React template mandates shadcn. This project doesn't mandate a specific
# UI library (styling/component-library choice is this system's open/cosmetic axis —
# see CONTEXT.md), so this version checks for the same underlying problem (hardcoded
# color literals) without assuming a specific token naming scheme.

set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$FILE_PATH" in
  *.scss|*.css|*.html) ;;
  *) exit 0 ;;
esac

if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

# Hardcoded hex/rgb/hsl color literals, excluding comment lines and CSS custom
# property *definitions* (--my-color: #fff;) — defining the token once in a central
# theme file is fine; scattering literals through component styles is the problem.
# Filter exclusions BEFORE adding line numbers (grep -n prefixes "N:" onto each line,
# which would otherwise break a ^-anchored exclusion pattern applied afterward).
FILTERED_CONTENT=$(echo "$CONTENT" \
  | grep -vE '^\s*//' \
  | grep -vE '^\s*/\*' \
  | grep -vE '^\s*--[a-zA-Z-]+\s*:')

VIOLATIONS=$(echo "$FILTERED_CONTENT" | grep -nE '(#[0-9a-fA-F]{3,8}\b|rgba?\s*\(|hsla?\s*\()' || true)

if [ -n "$VIOLATIONS" ]; then
  echo "BLOCKED: hardcoded color value(s) found in $FILE_PATH." >&2
  echo "Violations:" >&2
  echo "$VIOLATIONS" >&2
  echo "" >&2
  echo "Rule: colors belong in a central design-token source (CSS custom properties in" >&2
  echo "a theme/variables file, or the chosen UI library's token system) — not scattered" >&2
  echo "literal hex/rgb/hsl values across component styles/templates." >&2
  echo "If this file IS the central theme/token definition, this is expected — flag it" >&2
  echo "to a developer if the hook seems to be misfiring on a legitimate theme file." >&2
  exit 2
fi

exit 0
