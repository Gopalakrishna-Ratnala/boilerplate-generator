# Bundle Contract

> Every option, on every axis, follows this exact structure. `generate.js` relies on
> this shape being consistent — don't improvise a different layout per bundle.

```
bundles/<axis>/<option>/
├── manifest.json            # metadata generate.js reads to know what to do with this bundle
├── deps.fragment.json       # dependencies/devDependencies to merge into package.json
├── scripts.fragment.json    # OPTIONAL — npm "scripts" entries to merge into package.json.
│                            # Only add this if the bundle genuinely needs its own npm
│                            # script (e.g. starting a local fake-API server) — most
│                            # bundles don't need this at all. Never overwrites an
│                            # existing script of the same name; skips with a warning.
├── settings.fragment.json   # additional permission/deny rules to merge into .claude/settings.json
├── rules/
│   └── <axis>.md            # copied to .claude/rules/<axis>.md in the generated repo
└── files/                   # source files copied as-is into the generated repo, same relative paths
    └── src/app/...
```

## `manifest.json` shape

```json
{
  "axis": "auth",
  "option": "oauth-sso",
  "label": "OAuth / SSO",
  "description": "One-line description shown back to the user during the conversational Q&A.",
  "claudeMdSummaryLine": "Auth: OAuth/SSO (short line inserted into the generated CLAUDE.md's 'Selected bundles' list)",
  "knownIssues": [
    "Optional. Use when a bundle has a real, currently-unresolved compatibility caveat (e.g. a dependency's peer-dependency range lagging the locked Angular version). generate.js should surface these back to the user/developer at generation time rather than silently proceeding. Omit the field entirely when there's nothing to flag."
  ],
  "requires": {
    "auth": ["basic-auth", "oauth-sso", "saml"]
  }
}
```

`requires` is optional. Use it when an option on one axis only makes sense combined with
specific options on another axis (e.g. `roles: rbac` needs *some* authenticated user to
attach a role to — it's incompatible with `auth: none`). Shape: `{ "<axis>":
["<allowed-option>", ...] }`. `generate.js` should validate the user's full selection
against every bundle's `requires` before generating anything, and refuse with a clear
message rather than generating an inconsistent repo. Omit the field when an option has
no cross-axis dependency.

`postGenerateCommands` is optional: an array of shell commands `generate.js` runs
**after** merging `files/`/`deps.fragment.json` but **before** the final commit/push —
e.g. `["ng add @angular/ssr --skip-confirmation"]`. Use this instead of hand-writing
`files/` for anything the Angular CLI itself scaffolds and keeps in sync with the
installed Angular version (SSR bootstrap plumbing, schematics-driven setup). Hand-writing
files that a CLI schematic already generates means maintaining a duplicate of
fast-moving framework internals that will drift stale — prefer running the real
schematic. Only use static `files/` for bundle logic that has no CLI schematic
(everything in `auth`, `data-layer`, `state`, `roles` so far).

`minAngularMajor` / `maxAngularMajor` are optional integers. Use them when a bundle
option has a real, verified Angular-version floor/ceiling from its own package's peer
dependencies (checked against the live npm registry, not assumed) — e.g.
`"minAngularMajor": 22` for `auth/oauth-sso` (its real peer requirement), or
`"minAngularMajor": 21, "maxAngularMajor": 21` for anything whose peer range is a
single-version window (`state/ngrx-signalstore`, `styling/primeng`, both verified this
way). `generate.js` validates the requested `--angular-version` against every selected
bundle's range before generating anything, refusing clearly on an out-of-range
combination — same "flag it, don't generate something broken" principle as `requires`.
Omit both fields when an option has no real version constraint (true for anything
schematic-driven via `ng add`, which self-resolves a compatible version).

`needsHttpClient` (optional boolean) and `httpInterceptors` (optional array of
`{ "importName": "...", "importFrom": "..." }`) exist because of a real,
previously-undetected bug (found via actual feature-building, not structural
validation): several bundles generate code that assumes `HttpClient` is available
(`inject(HttpClient)` in a service, an interceptor file) but nothing ever actually
called `provideHttpClient()` in `app.config.ts` — a silent *runtime* failure invisible
to `ng lint`/`ng build`. Set `needsHttpClient: true` on any bundle whose files directly
inject `HttpClient` or depend on something that does (Apollo Angular's `HttpLink`, for
instance). List an entry in `httpInterceptors` for any interceptor file the bundle
ships that needs registering. `generate.js` collects these across every selected
bundle and assembles exactly one combined `provideHttpClient(withInterceptors([...]))`
call in `app.config.ts` if any bundle needs it — this is real, automatic wiring, not a
"manual step" note, since there's no per-project decision involved (unlike PrimeNG's
theme choice or Auth0's domain/clientId, which genuinely can't be automated).

## Rules for every `<axis>.md` inside a bundle option

1. Follows the same section order every time (see `auth/oauth-sso/rules/auth.md` as the
   reference example):
   - **What pattern is used** (one paragraph, plain statement of fact)
   - **What the AI agent may do** (bullet list)
   - **What the AI agent must NOT do** (bullet list — this is the part enforcement
     hooks back up)
   - **Where the code lives** (file paths, matching `files/`)
2. Written as fact about *this specific project* ("this project uses X"), not as a
   general tutorial about the technology. The general Angular/security guidance already
   lives in `base/.claude/rules/`; a bundle rule file's only job is "here is the specific
   choice already made for this concern, stay inside it."
3. Kept short — a bundle rule file should be scannable in under a minute.

## `deps.fragment.json` shape

Plain object matching `package.json`'s shape, merged in by `generate.js`:
```json
{
  "dependencies": { "package-name": "^1.2.3" },
  "devDependencies": {}
}
```

## `settings.fragment.json` shape

Same shape as the `permissions` block in `.claude/settings.json` — only the *additional*
rules this bundle needs on top of `base/`'s defaults:
```json
{
  "deny": ["Edit(./src/app/core/auth/**)"]
}
```
`generate.js` merges these arrays into `base/.claude/settings.json`'s corresponding
arrays — it does not replace the base file.

## `files/` rules

- Mirrors the target repo's structure exactly (`files/src/app/core/guards/auth.guard.ts`
  → lands at `src/app/core/guards/auth.guard.ts`).
- If two bundles on *different axes* could ever touch the same file, that's a conflict
  to resolve at generator-design time, not generation time — flag it, don't let
  `generate.js` silently overwrite.
- Within one axis, only one option is ever selected, so no intra-axis collision is
  possible by construction.
