# Security & Hard Constraints (Company Standard)

> These are company rules, not Angular's. They exist because this repo may be driven by
> a non-developer using an AI agent before formal developer review. Every rule here has
> a matching enforcement mechanism in `.claude/settings.json` where possible — this file
> explains *why*, the settings file makes it *actually happen*. If a rule below has no
> matching hook/permission entry, treat it as still binding, just not machine-enforced yet.

## Dependencies

- **Never run `npm install <new-package>`, `npm uninstall`, or edit `package.json`
  dependency versions.** The dependency set for this project was fixed at generation
  time based on the client's selected options. If a task genuinely seems to need a new
  package, stop and say so — do not add it.
- Never run `npm audit fix --force` or any command that changes lockfile versions.

## Protected files — do not edit

- `angular.json`
- `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`
- `.env`, `.env.*`, anything under `secrets/`
- `src/environments/**` (per-environment config — API URLs, feature flags, keys —
  set once by a developer per environment; not something to guess or "fill in")
- `.github/**` (CI/CD)
- `.claude/settings.json`, `.claude/rules/**`, `.claude/hooks/**` (this guardrail system itself)
- `tsconfig*.json` (strictness must not be loosened)

These are enforced by `deny` rules in `.claude/settings.json`. If a tool call is blocked
because of this, that is expected behavior — do not try to work around it (e.g. by
renaming a file, using a different tool, or asking for `--dangerously-skip-permissions`).
Flag it to a developer instead.

## Secrets

- Never hardcode an API key, token, password, or connection string in source. Use
  environment variables and reference them via Angular's environment files, which are
  themselves excluded from AI edits (see above) — ask a developer to add new environment
  values.
- Never print the contents of `.env*` files, even to explain what's in them.

## Network / external calls

- Do not run `curl`, `wget`, or similar commands against arbitrary URLs. If the task
  needs to check documentation, prefer the project's configured MCP servers (e.g.
  Context7, Angular CLI MCP) over ad hoc network calls.

## Auth / core

- Do not modify files under `src/app/core/` (guards, interceptors, root auth services)
  unless the current task is explicitly about the authentication pattern already
  selected for this project (see `.claude/rules/auth.md`), and even then, follow that
  file's pattern rather than introducing a new one.

## Git

- Do not force-push (`git push --force` / `-f`).
- Do not rewrite history (`git rebase -i`, `git commit --amend` on already-pushed
  commits).
- Commit frequently, in small, working, Conventional-Commit-labeled increments.

## When blocked

If a hook or permission rule blocks an action, that's the system working as intended —
explain to the user what was blocked and why, and suggest they flag it to a developer,
rather than searching for an alternate path to the same result.
