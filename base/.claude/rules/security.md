# Security (Company Hard Constraints + Angular's Official Security Model)

> This file has two parts. **Part 1** is company rules (not Angular's) — they exist
> because this repo may be driven by a non-developer using an AI agent before formal
> developer review. Every rule there has a matching enforcement mechanism in
> `.claude/settings.json` where possible. **Part 2** is Angular's own official
> application-security guidance (angular.dev/best-practices/security) — this is the
> framework's model for preventing real vulnerabilities (XSS, CSRF) in the code itself,
> not just a list of protected files. Both matter for "reliable, standard code" — Part 1
> without Part 2 protects the repo's structure but not the security of what gets built
> inside it.

---

## Part 1 — Company hard constraints

### Dependencies

- **Never run `npm install <new-package>`, `npm uninstall`, or edit `package.json`
  dependency versions.** The dependency set for this project was fixed at generation
  time based on the client's selected options. If a task genuinely seems to need a new
  package, stop and say so — do not add it.
- Never run `npm audit fix --force` or any command that changes lockfile versions.
- **`git commit` is hook-blocked if `npm audit` finds any vulnerability**
  (`.claude/hooks/check-dependency-security.sh`) — this isn't just a review-time
  concern, the commit itself will fail. If a commit is blocked this way, flag it to a
  developer rather than force-installing a fix or overriding the audit.

### Protected files — do not edit

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

### Secrets

- Never hardcode an API key, token, password, or connection string in source. Use
  environment variables and reference them via Angular's environment files, which are
  themselves excluded from AI edits (see above) — ask a developer to add new environment
  values.
- Never print the contents of `.env*` files, even to explain what's in them.

### Network / external calls

- Do not run `curl`, `wget`, or similar commands against arbitrary URLs. If the task
  needs to check documentation, prefer the project's configured MCP servers (e.g.
  Context7, Angular CLI MCP) over ad hoc network calls.

### Auth / core

- Do not modify files under `src/app/core/` (guards, interceptors, root auth services)
  unless the current task is explicitly about the authentication pattern already
  selected for this project (see `.claude/rules/auth.md`), and even then, follow that
  file's pattern rather than introducing a new one.

### Git

- Do not force-push (`git push --force` / `-f`).
- Do not rewrite history (`git rebase -i`, `git commit --amend` on already-pushed
  commits).
- Commit frequently, in small, working, Conventional-Commit-labeled increments.

### When blocked

If a hook or permission rule blocks an action, that's the system working as intended —
explain to the user what was blocked and why, and suggest they flag it to a developer,
rather than searching for an alternate path to the same result.

---

## Part 2 — Angular's official application security model

### Cross-site scripting (XSS) — Angular sanitizes by default; don't disable that

Angular treats every template-bound value as untrusted and automatically sanitizes it
before inserting it into the DOM (for HTML and URL contexts). This is the framework's
primary XSS defense, and it happens without you doing anything — **the risk is turning
it off, not forgetting to turn it on.**

- **`DomSanitizer.bypassSecurityTrustHtml` / `bypassSecurityTrustScript` /
  `bypassSecurityTrustStyle` / `bypassSecurityTrustUrl` / `bypassSecurityTrustResourceUrl`
  are explicitly marked "Security Risk" in Angular's own documentation.** Do not call
  any of these to "fix" a rendering or binding issue without stopping and flagging it
  for human security review first. Using one of these on attacker-influenceable data is
  a real XSS vulnerability, not a style issue.
- If a task seems to require one of these (e.g. rendering rich HTML from a CMS, embedding
  a YouTube `<iframe>` from a user-provided ID), that's a legitimate use case Angular's
  own docs describe — but construct the trusted value as close as possible to the raw
  input, and flag the change for review rather than treating it as routine.
- **Never build a template by concatenating user input with template syntax**, and never
  use the JIT compiler with untrusted template strings — this is template injection,
  equivalent to arbitrary code execution. This project uses the default AOT compiler in
  production, which structurally prevents this class of bug — don't introduce a
  JIT-based dynamic-template pattern.
- Prefer Angular template bindings over direct DOM manipulation (`ElementRef.nativeElement`,
  raw `document.*` calls) — bindings get automatic sanitization; direct DOM APIs don't.

### Content Security Policy & Trusted Types (defense in depth)

- If this project's deployment target has CSP/Trusted Types headers configured (a
  backend/infra concern, not something this repo controls directly), do not add inline
  `<script>`/`<style>` content or patterns that would require loosening those headers
  (e.g. `'unsafe-inline'`) — flag it instead of working around it.
- If asked to help configure CSP, the minimum viable policy for an Angular app is
  `default-src 'self'; style-src 'self' 'nonce-<value>'; script-src 'self' 'nonce-<value>'`,
  with a per-request unique nonce provided via the `CSP_NONCE` injection token (or the
  `ngCspNonce` attribute) — never a hardcoded or predictable nonce.

### Cross-site request forgery (CSRF/XSRF) — already handled by `HttpClient`, don't disable it

Angular's `HttpClient` (used by this project's `rest`/`graphql` data-layer bundles, where
selected) automatically reads a `XSRF-TOKEN` cookie and attaches it as an `X-XSRF-TOKEN`
header on mutating requests (POST/PUT/PATCH/DELETE), by default. This requires backend
cooperation (the server must set and verify that cookie) but the client-side half is
already handled — don't reimplement it manually in an interceptor.

- **Do not call `withNoXsrfProtection()`** on `provideHttpClient(...)` unless a developer
  has explicitly decided this project doesn't need CSRF protection (e.g. a token-header-only
  API with no cookie-based session). This is a real protection to disable casually.
- If the backend uses different cookie/header names than Angular's defaults
  (`XSRF-TOKEN`/`X-XSRF-TOKEN`), use `withXsrfConfiguration({ cookieName, headerName })`
  rather than hand-rolling the token-forwarding logic in a custom interceptor.

### Cross-site script inclusion (XSSI) — already handled, informational only

`HttpClient` automatically strips the `")]}',\n"` XSSI-prevention prefix some backends
add to JSON responses. No action needed — just don't be confused if you see this prefix
mentioned in backend API documentation; Angular already handles it.

### SSRF protection for SSR — see `.claude/rules/deploy-target.md` if this project uses SSR

If this project's `deploy-target` bundle is `ssr`, Angular's Node server has its own
host-header validation (`allowedHosts`, `trustProxyHeaders`) to prevent server-side
request forgery — covered in that bundle's own rule file, not repeated here.

