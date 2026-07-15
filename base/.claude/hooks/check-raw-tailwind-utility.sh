#!/usr/bin/env bash
# PreToolUse hook — matcher: Write|Edit|MultiEdit
# Enforces: raw Tailwind color utility classes (bg-blue-500, text-red-600, etc.) are
# blocked in favor of semantic/design-token classes (bg-primary, text-danger, etc.).
# Found as a real gap via a client requirement doc: check-hardcoded-colors.sh already
# catches literal hex/rgb/hsl values, but does NOT catch raw Tailwind utility class
# names, which are a different kind of "hardcoded color" — a real color choice baked
# directly into markup instead of routed through the project's design-token/@theme
# definitions (see the tailwind styling bundle's own rules file).

set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$FILE_PATH" in
  *.html|*.ts) ;;
  *) exit 0 ;;
esac

if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

# Tailwind's default palette color names + a shade number — this pattern only
# matches RAW utility classes, never a semantic token class (semantic classes don't
# follow the color-name + numeric-shade convention).
PALETTE='slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
VIOLATIONS=$(echo "$CONTENT" | grep -nE "\b(bg|text|border|ring|fill|stroke|from|via|to|divide|outline|decoration|accent|caret)-($PALETTE)-(50|100|200|300|400|500|600|700|800|900|950)\b" || true)

if [ -n "$VIOLATIONS" ]; then
  echo "BLOCKED: raw Tailwind color utility class detected in $FILE_PATH." >&2
  echo "Violations:" >&2
  echo "$VIOLATIONS" >&2
  echo "" >&2
  echo "Rule: colors must be gated through this project's design tokens — use a" >&2
  echo "semantic utility class (e.g. bg-primary, text-danger) defined in the" >&2
  echo "@theme block, not a raw palette-plus-shade class like bg-blue-500." >&2
  echo "Source: the selected styling bundle's rules file." >&2
  exit 2
fi

exit 0
