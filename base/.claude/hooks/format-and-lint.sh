#!/usr/bin/env bash
# PostToolUse hook — matcher: Write|Edit|MultiEdit
# Auto-formats and lints the file the agent just touched. Non-blocking:
# this is about consistency, not correctness, so it never exits 2 —
# a formatting issue shouldn't halt the agent's task.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts|*.html|*.scss|*.css|*.json)
    npx prettier --write "$FILE_PATH" >/dev/null 2>&1 || true
    ;;
esac

case "$FILE_PATH" in
  *.ts)
    npx eslint --fix "$FILE_PATH" >/dev/null 2>&1 || true
    ;;
esac

exit 0
