#!/usr/bin/env bash
# PostToolUse hook — matcher: Write
# Warns (non-blocking): a new component/service/pipe/guard/directive file has no
# co-located .spec.ts yet.
#
# IMPORTANT exit-code note, found via real testing: Claude Code silently discards a
# PostToolUse hook's stdout/stderr when it exits 0 — that output only reaches an
# internal debug log, never the visible transcript. This means a hook designed to
# "warn but not block" must NOT exit 0 when it has something to say — exit 0 there
# means the warning was never actually seen by anyone, which is exactly what
# happened here until this was found and fixed. Use any non-zero, non-2 exit code
# (here: 1) to get a genuinely visible-but-non-blocking warning; reserve exit 0 for
# the case where there's truly nothing to report.

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
  exit 1
fi

exit 0
