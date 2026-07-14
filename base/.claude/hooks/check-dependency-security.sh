#!/usr/bin/env bash
# PreToolUse hook — matcher: Bash
# Blocks `git commit` if `npm audit` reports any vulnerability. Framework-agnostic —
# adapted directly from the company's ai-ready-react-template, which had this as a
# hook already; ported as-is since nothing here is React-specific.

set -uo pipefail

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

if ! echo "$COMMAND" | grep -qE '^\s*git\s+commit'; then
  exit 0
fi

AUDIT_OUTPUT=$(npm audit --json 2>/dev/null)
TOTAL=$(echo "$AUDIT_OUTPUT" | jq '.metadata.vulnerabilities | .critical + .high + .moderate + .low' 2>/dev/null)

# If npm audit couldn't run or its output wasn't parseable (no package.json, no
# network, unexpected format), TOTAL will be empty or the literal string "null" —
# fail safe (warn, don't block) rather than block on a count we can't actually
# determine. A real generated project always has a package.json; this only matters
# in edge/test conditions.
if ! echo "$TOTAL" | grep -qE '^[0-9]+$'; then
  echo "WARNING: could not determine npm audit vulnerability count — skipping check." >&2
  exit 0
fi

if [ "$TOTAL" = "0" ]; then
  exit 0
fi

CRITICAL=$(echo "$AUDIT_OUTPUT" | jq '.metadata.vulnerabilities.critical' 2>/dev/null || echo "0")
HIGH=$(echo "$AUDIT_OUTPUT" | jq '.metadata.vulnerabilities.high' 2>/dev/null || echo "0")
MODERATE=$(echo "$AUDIT_OUTPUT" | jq '.metadata.vulnerabilities.moderate' 2>/dev/null || echo "0")
LOW=$(echo "$AUDIT_OUTPUT" | jq '.metadata.vulnerabilities.low' 2>/dev/null || echo "0")

echo "BLOCKED: npm audit found $TOTAL vulnerability(ies) — commit rejected." >&2
echo "" >&2
echo "  Critical : $CRITICAL" >&2
echo "  High     : $HIGH" >&2
echo "  Moderate : $MODERATE" >&2
echo "  Low      : $LOW" >&2
echo "" >&2
echo "Run 'npm audit' to see details, and 'npm audit fix' if a safe fix exists." >&2
echo "If no safe fix exists, flag this to a developer rather than force-installing" >&2
echo "or overriding — see .claude/rules/security.md." >&2

exit 2
