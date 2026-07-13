# Project Context: Angular Boilerplate Generator

> Purpose of this file: let anyone (including a future AI session) pick up exactly where
> this left off, without re-deriving the reasoning from scratch. Update this file at the
> end of any session that makes a new decision or changes direction.

**Last updated:** 2026-07-13 (session 9)
**Status:** All 5 fixed-axis bundles complete and audited. **`scripts/generate.js` built
and genuinely end-to-end tested — 2 real bugs found and fixed during testing, not
theoretical.** Remaining: the `new-angular-project` Claude Code skill (conversational
wrapper around `generate.js`), then Case 2 question phrasing. Pushed to GitHub:
`https://github.com/Gopalakrishna-Ratnala/boilerplate-generator` (branch `main`).

---

## 1. The problem being solved

Conventional flow: PO + Designer gather requirements from the client → finalize design →
**then** hand off to developers, who only start coding after that handoff. Serial,
slow.

**Goal:** shift left. During the *same* client-requirements conversations, the
Designer/PO — using AI coding agents (Claude, Codex, Copilot) — generate real working
code in parallel with the requirements discussion, not just mockups. By the time the
client signs off on the design, working code already exists.

**The risk this creates:** Designers aren't developers. Left alone with an AI agent,
they (and the agent) could make bad architectural decisions, pick wrong dependencies, or
produce code inconsistent with how the dev team actually builds — creating a mess for
developers to inherit, instead of a head start.

**Risk categories called out explicitly (all weighted equally):**
1. Wrong architecture/structure (hard to refactor later)
2. Wrong dependencies/security issues
3. Inconsistent code style/conventions

---

## 2. The two-part solution

### Part A — Client question list (not yet built)
A developer-authored question list that PO/Designer ask the client *during*
requirements gathering, phrased differently depending on whether the client is
technically literate (**Case 1**) or not (**Case 2**). Answers map to concrete technical
decisions.

**Decision: hybrid split** between fixed and open axes:

- **Fixed axes** (client picks from a pre-approved menu — drives architecture/deps/security):
  1. Authentication mechanism
  2. Data layer (REST / GraphQL / real-time / mock)
  3. State complexity (local signals vs. shared/global)
  4. Roles & access (single role vs. RBAC)
  5. Deployment target (SPA vs. SSR)
- **Open axes** (designer + AI decide freely, but from an approved shortlist, not fully unlimited):
  - Visual theme/colors/typography
  - Component library skin (from a shortlist)
  - Copy/imagery/layout arrangement
  - Micro-interactions/animation

**Case 1 (technical client) phrasing — done, see §5 below for the actual questions.**
**Case 2 (non-technical client) phrasing — not yet drafted.**

### Part B — The generator system (in progress)
A standalone tool, **not used for actual feature coding** — its only job is: take the
client's answers → assemble a new, correctly-configured Angular + TypeScript repo (deps,
folder structure, full `.claude` guardrail config) → push it to an empty GitHub repo the
user provides. That new repo is what the Designer's AI agent works inside afterward.

**Key architectural decision — deterministic core, conversational shell:**
- The actual file assembly (`generate.js`) is **plain, deterministic code** — no AI
  involved in assembly. Same inputs always produce the same output, byte for byte.
- A **Claude Code skill** (conversational) asks the questions, collects the GitHub repo
  URL, and then just *calls* `generate.js` with flags. The AI's role is limited to
  conversation and dispatch, never to hand-assembling the output files itself.
- Rationale: this keeps the one part of the system most people will actually interact
  with (a non-developer talking to an AI) from being the part that also decides
  architecture/deps — that decision is pre-baked into deterministic bundle templates.

**Repo push:** GitHub Personal Access Token via env var (`GITHUB_TOKEN`), read at
runtime by `generate.js`, never committed/logged. Target is an **already-created empty
repo**; the generator pushes an initial commit into it (does not create the repo itself).

---

## 3. Repo structure (as currently planned/built)

```
boilerplate-generator/
├── CONTEXT.md                     # this file
├── .claude/
│   └── skills/
│       └── new-angular-project/
│           └── SKILL.md           # conversational Q&A — NOT YET BUILT
├── base/                          # ✅ BUILT — always-included in every generated repo
│   ├── CLAUDE.md
│   └── .claude/
│       ├── settings.json
│       ├── rules/
│       │   ├── angular.md
│       │   ├── architecture.md
│       │   └── security.md
│       └── hooks/
│           ├── protect-paths.sh
│           ├── guard-bash.sh
│           └── format-and-lint.sh
├── bundles/
│   ├── BUNDLE-CONTRACT.md         # ✅ BUILT — fixed structure every bundle follows
│   ├── auth/{none, basic-auth, oauth-sso, saml}/           # ✅ BUILT
│   ├── data-layer/{mock, rest, graphql, realtime}/          # ✅ BUILT
│   ├── state/{signals-only, ngrx-signalstore}/               # ✅ BUILT
│   ├── roles/{single-role, rbac}/                           # ✅ BUILT
│   └── deploy-target/{spa, ssr}/                            # ✅ BUILT
└── scripts/
    └── generate.js                # ✅ BUILT AND END-TO-END TESTED (session 9)
```

---

## 4. What's built so far, and why (the `base/` layer)

Every generated repo gets this regardless of which bundles are selected.

| File | Role |
|---|---|
| `CLAUDE.md` | Persistent memory: what the project is, tech stack, commands, architecture, hard constraints. Contains `{{PLACEHOLDER}}` tokens for `generate.js` to fill in per project. |
| `.claude/rules/angular.md` | **Angular's own official guidance** (angular.dev/ai/develop-with-ai) — standalone components, signals, zoneless, native control flow, Vitest. Deliberately kept separate from house rules so it's clear what's "framework says so" vs. "we say so." |
| `.claude/rules/architecture.md` | **House-specific** folder structure (`core/`/`shared/`/`features/`/`layout/`) and naming conventions. |
| `.claude/rules/security.md` | The hard constraints, explained (why each hook exists). |
| `.claude/settings.json` | The actual enforcement: `allow`/`ask`/`deny` permission rules + hook wiring. **This is the single source of truth for every protected path and blocked command.** |
| `.claude/hooks/protect-paths.sh` | PreToolUse hook, blocks Write/Edit on protected files. **Reads its pattern list from `settings.json` at runtime rather than duplicating it** — added value is only a clearer error message. |
| `.claude/hooks/guard-bash.sh` | PreToolUse hook, blocks dangerous Bash commands (npm install, force-push, rm -rf, curl/wget). Same single-source-of-truth pattern as above. |
| `.claude/hooks/format-and-lint.sh` | PostToolUse hook, auto-runs Prettier + ESLint on every touched file — non-blocking, consistency by default. |

**Key design principles established (apply to all future bundles too):**

1. **Hard rules live in hooks/permissions, not just prose.** CLAUDE.md instructions alone
   are followed ~70% of the time (per research); hooks close that to ~100%. Every rule
   in `security.md` has (or should have) a matching enforcement mechanism.
2. **CLAUDE.md stays short** (WHAT/WHY/HOW structure, well under ~200 lines). Longer
   detail goes into `.claude/rules/*.md`, loaded only when relevant.
3. **Angular's official guidance and house rules are kept in separate files** — never
   blended — so it's always clear which is which.
4. **Single source of truth over redundancy.** When the same protected-path list nearly
   existed in both `settings.json` and the hook scripts, the resolution was: `settings.json`
   is authoritative, hooks read from it at runtime. Applies to future bundles: don't
   duplicate a list across files — derive one from the other.
5. **Test before calling anything done.** Hooks were tested with real stdin payloads
   (block cases and allow cases) before being accepted — not just read for plausibility.
6. **Every bundle should follow one fixed template** (same section order/tone) so an
   agent — and a human reviewer — gets a predictable shape reading any bundle.

**Known runtime dependency to carry forward:** the hooks require `jq` to be installed.
`generate.js` should check for `jq` and document it as a prerequisite — this was
discovered during testing (hooks silently failed with exit 127 until `jq` was installed
in the test sandbox).

---

## 5. Case 1 (technical client) question list — drafted

1. **Authentication:** "What authentication mechanism does this application need?" →
   No auth / Basic email-password / OAuth-SSO / Enterprise SAML
2. **Data layer:** "How will the frontend get its data — REST, GraphQL, or real-time?" →
   REST / GraphQL / Real-time / Static-mock
3. **State complexity:** "Is state mostly local to screens, or shared across many
   features?" → Local/simple / Shared/complex
4. **Roles & access:** "Does everyone have the same permissions, or are there
   different roles?" → Single role / RBAC
5. **Deployment target:** "Does this need SEO/fast first-paint (SSR), or is it
   internal/behind-login (SPA)?" → SPA / SSR

Plus, always: "Please provide the empty GitHub repository URL to push to."

**Open items flagged during drafting, not yet resolved:**
- Q3/Q4 are the most likely to get "not sure" from even a technical client — need to
  decide: does the Designer default to the simpler option and upgrade later, or does
  that punt to dev review before proceeding?
- Current phrasing is single-select per axis. Real projects might need multi-select
  (e.g., "no auth for public pages + OAuth for admin area") — deliberately deferred
  because it complicates bundle-merging logic in the generator. Revisit once `generate.js`
  exists and we know how hard multi-select merging actually is.

**Case 2 (non-technical client) phrasing — not started.**

---

## 6. Bundle contract (established this session)

Before building any bundle, a fixed structural contract was written to
`bundles/BUNDLE-CONTRACT.md` — every axis/option must follow it, so `generate.js` can
rely on a predictable shape and reviewers get a consistent read across bundles:

```
bundles/<axis>/<option>/
├── manifest.json            # axis, option, label, description, claudeMdSummaryLine
├── deps.fragment.json       # { dependencies, devDependencies } to merge into package.json
├── settings.fragment.json   # additional permission rules to merge into .claude/settings.json
├── rules/<axis>.md          # fixed section order: pattern / may-do / must-not-do / where-code-lives
└── files/                   # source files, mirrors target repo path exactly
```

Key rule: a bundle's `<axis>.md` describes the **specific choice already made** for this
project ("this project uses X"), not a general tutorial — general Angular/security
guidance stays in `base/.claude/rules/`.

## 7. `auth` bundle — ✅ built and tested (all 4 options)

| Option | Pattern | Frontend deps added | Files added |
|---|---|---|---|
| `none` | No login, fully public | none | none (deliberately) |
| `basic-auth` | Email/password against own backend, JWT | none (plain `HttpClient`) | `auth.service.ts`, `auth.interceptor.ts`, `auth.guard.ts` |
| `oauth-sso` | External IdP (Google/Microsoft/etc.), OAuth2/OIDC | `angular-oauth2-oidc` (version checked live against npm registry: `^22.0.2`, not assumed from memory) | `auth.service.ts`, `auth.guard.ts`, `core/config/oauth.config.ts` |
| `saml` | Enterprise SAML, backend-handled assertion, session cookie | none (backend owns the SAML protocol entirely) | `auth.service.ts`, `auth.guard.ts` |

**Design decisions made while building this bundle (apply to future bundles too):**

- **Isolate sensitive config into its own file when a shared file (like
  `app.config.ts`) mixes sensitive and normal-editable content.** Hooks/deny rules are
  file-level, not line-level — denying all of `app.config.ts` would have blocked
  legitimate unrelated edits (routing, other providers). Resolution used for
  `oauth-sso`: pulled `issuer`/`clientId`/`redirectUri` into a dedicated
  `core/config/oauth.config.ts`, fully protected, leaving `app.config.ts` itself
  editable. **Apply this pattern to any future bundle that would otherwise want to
  protect part of a shared file.**
- **SAML is handled entirely server-side.** The frontend `auth.service.ts` only
  redirects to a backend login-initiation endpoint and checks session state via a
  `/api/auth/session` call relying on an httpOnly cookie — it never touches SAML
  XML/certificates. This is stated explicitly as a hard "must not" in the rule file,
  since an AI agent asked to "add SAML support" might otherwise reach for a
  browser-side SAML library, which would be a real security anti-pattern.
- **Every TypeScript file was syntax-checked with `tsc --noEmit`** (ignoring expected
  "cannot find module" errors for `@angular/*` packages not installed in the test
  sandbox) before being considered done — caught nothing this round, but the process is
  now established and should be repeated for every future bundle's files.
- **Every JSON fragment was validated with `jq empty`** across all 4 options (12 files) —
  all valid.
- **One real dependency version was verified against the live npm registry**
  (`angular-oauth2-oidc`) rather than trusted from memory — the remembered version
  (`^17.0.2`) was stale; the actual latest was `^22.0.2`. **Do this for every real
  package version added in future bundles — don't trust a remembered version number.**

---

## 8. `data-layer` bundle — ✅ built and tested (all 4 options)

| Option | Pattern | Deps added (all versions checked live on npm registry) | Files added |
|---|---|---|---|
| `mock` | In-memory fixtures wrapped with a simulated-delay helper | none | `shared/services/mock-response.ts` |
| `rest` | HttpClient via a shared `ApiService`, centralized error interceptor | none | `core/config/api.config.ts`, `core/services/api.service.ts`, `core/interceptors/error.interceptor.ts` |
| `graphql` | Apollo Angular | `apollo-angular@14.1.0`, `@apollo/client@4.2.6`, `graphql@16.14.2` | `core/config/graphql.config.ts` |
| `realtime` | Single shared socket via `socket.io-client`, signal-based connection state | `socket.io-client@4.8.3` | `core/config/realtime.config.ts`, `core/services/realtime.service.ts` |

**Notable catch this bundle:** `apollo-angular@14.1.0`'s peer dependency requires
`graphql ^16.0.0`, but the absolute latest `graphql` on npm is `17.0.2`. Pinning latest
would have broken peer-dependency resolution on `npm install`. Checked the registry for
the latest *stable 16.x* instead (`16.14.2`) and pinned that. **Lesson for future
bundles: when adding a dependency that has peer dependencies, check the peer dependency
range too, not just the dependency's own latest version.**

**Trade-off flagged to user, not yet resolved:** the `realtime` option locks the
frontend to **Socket.IO specifically** — it only works if the backend also runs
Socket.IO (not plain WebSocket, not SignalR). Reasonable default (handles
reconnection/fallback automatically, most common JS-ecosystem choice), but if backends
often differ across client projects, this bundle may need a variant (e.g.
`realtime-native-ws`) later.

Same validation discipline as `auth`: every JSON fragment validated with `jq empty`
(12/12 valid), every `.ts` file syntax-checked with `tsc --noEmit` (only expected
"implicit any" noise from `rxjs`/`@angular/common/http` types not being installed in the
bare test sandbox — confirmed by checking `node_modules` directly, not assumed).

## 9. `state` bundle — ✅ built and tested (both options)

| Option | Pattern | Deps added | Files added |
|---|---|---|---|
| `signals-only` | Plain `signal()`/`computed()` in per-feature services, no library | none | none (deliberately — pattern is conventional, enforced via rules only, like `auth/none`) |
| `ngrx-signalstore` | `signalStore()` per feature via `@ngrx/signals` | `@ngrx/signals@^21.1.1` | none (each feature owns its own store file; no single shared mechanism to protect) |

**Real compatibility issue found and NOT silently resolved:** `@ngrx/signals@21.1.1`'s
peer dependency allows only `@angular/core ^21.0.0`, but this project's locked base
stack is "latest stable Angular" — currently `22.0.6` (verified live). Selecting
`ngrx-signalstore` will hit a peer-dependency conflict against the project's own locked
Angular version. **Asked the user directly rather than deciding unilaterally — decision:
flag it in docs and let a developer decide per-project** (not: auto-pin Angular down,
not: force-install with overrides). This is now documented in
`ngrx-signalstore/manifest.json`'s new `knownIssues` field and at the top of its
`rules/state.md`. **`knownIssues` was added as an official optional field in
`bundles/BUNDLE-CONTRACT.md`** — reusable for any future bundle with a similar
real-but-unresolved compatibility caveat; `generate.js` should surface these to the user
rather than silently proceeding.

Same validation discipline: both `deps.fragment.json`/`manifest.json`/
`settings.fragment.json` pairs validated with `jq empty` (6/6 valid). No `.ts` files in
this bundle by design, so no `tsc` check applicable — the state bundles are conventions
enforced through `rules/state.md`, not a shared file to protect (same shape as
`auth/none`).

## 10. `roles` bundle — ✅ built and tested (both options), including a real cross-bundle fix

| Option | Pattern | Deps added | Files added |
|---|---|---|---|
| `single-role` | Everyone has identical permissions, no role code | none | none (deliberately) |
| `rbac` | Route + UI gating by role, source of truth is `CurrentUser.roles` | none (plain Angular) | `core/config/roles.config.ts`, `core/guards/role.guard.ts`, `core/directives/has-role.directive.ts` |

**Real cross-bundle coupling problem found and fixed, not silently patched over:**
`rbac` needs to read the logged-in user's role, but that data comes from whichever
`auth` bundle was selected — and the `CurrentUser` interfaces built in session 3 had no
`roles` field. Per `BUNDLE-CONTRACT.md`'s own guidance ("if two bundles on different
axes could ever touch the same file, that's a conflict to resolve at generator-design
time"), this was resolved at design time:

- Went back and added an **optional** `roles?: string[]` field to `CurrentUser` in all
  three authenticated `auth` options (`basic-auth`, `oauth-sso`, `saml`) — harmless/unused
  when `roles: single-role` is selected, required plumbing when `roles: rbac` is
  selected. `oauth-sso`'s `loadUserProfile()` was also updated to map a `roles` claim
  into it (with a documented caveat: the claim name varies by identity provider — a
  developer may need to adjust it once the real IdP is known).
- **`rbac: auth: none` is a nonsensical combination** (RBAC needs *someone* to attach a
  role to). Rather than build generate.js-time validation logic now (generate.js
  doesn't exist yet), formalized this as a new **optional `requires` field** in
  `bundles/BUNDLE-CONTRACT.md`: `{ "requires": { "auth": ["basic-auth", "oauth-sso",
  "saml"] } }`. `generate.js` must validate every bundle's `requires` against the full
  selection before generating anything, and refuse with a clear message on a mismatch
  rather than generating an inconsistent repo. **This is now a required check for
  `generate.js`, not optional — added explicitly to its own to-do below.**

**Testing went further than previous bundles, appropriately** — since `rbac`'s files
(`role.guard.ts`, `has-role.directive.ts`) import `AuthService` from a path that only
exists once merged with an `auth` bundle, tested the actual merge (not just `rbac` in
isolation) against **all three** valid `auth` pairings (`basic-auth`, `oauth-sso`,
`saml`) by physically copying both bundles' `files/` into one temp directory and running
`tsc` over the combined tree. All three passed with only the same expected
missing-module noise. **This merge-testing pattern should be repeated for any future
bundle with a real cross-bundle file dependency.**

All JSON validated with `jq empty` (6/6 valid).

## 11. `deploy-target` bundle — ✅ built and tested (both options) — different approach, deliberately

| Option | Pattern | Deps added | Files added |
|---|---|---|---|
| `spa` | Default client-side rendering, no changes | none | none |
| `ssr` | Angular's own SSR via the real CLI schematic | none from us (schematic installs its own, version-matched) | none from us (schematic generates them) |

**This bundle broke from the established "ship static `files/`" pattern, deliberately,
not by oversight.** Angular's SSR bootstrap plumbing (`server.ts`,
`app.config.server.ts`) has changed meaningfully across versions (`CommonEngine` →
`AngularNodeAppEngine`, import paths moving between `@angular/ssr` and
`@angular/ssr/node`, etc.). Hand-writing and maintaining these files ourselves would mean
maintaining a duplicate of fast-moving framework internals that goes stale every Angular
release. Instead:

- **New contract field added: `postGenerateCommands`** (documented in
  `BUNDLE-CONTRACT.md`) — an array of shell commands `generate.js` must run after
  merging bundle files but before the final commit/push. `ssr`'s is
  `["ng add @angular/ssr --skip-confirmation"]` — the real Angular CLI schematic, always
  matched to whatever Angular version is actually installed.
- **This surfaces a hard prerequisite for `generate.js` that must be resolved:**
  `postGenerateCommands` assumes an actual Angular CLI project already exists (an
  `angular.json`, a real `package.json`, `src/` structure) before it can run `ng add`.
  **But `base/` currently contains only `CLAUDE.md` + `.claude/` — no actual Angular
  skeleton.** This was a known gap noted informally earlier; this bundle makes it
  concrete and blocking. `generate.js`'s first real step must be running `ng new
  <project> --skip-install --defaults` (or equivalent) to produce a real Angular
  workspace, and only then layering `base/.claude/` + selected bundles + running any
  `postGenerateCommands` on top. **This is now an explicit, required first step in
  `generate.js`'s spec below — not implicit.**
- `ssr`'s `settings.fragment.json` protects `server.ts` and `app.config.server.ts`
  (genuinely set-once, CLI-generated bootstrap) but **deliberately leaves
  `app.routes.server.ts` editable** — unlike previous "protect the shared mechanism"
  calls, this file is expected to be routinely extended (one entry per new route,
  choosing a `RenderMode`), so protecting it would block legitimate, expected work. This
  is the same "which parts of a shared file are truly set-once vs. routinely edited"
  judgment as the `oauth.config.ts` isolation, applied in the opposite direction —
  recognizing when a file should stay open rather than assuming more protection is
  always safer.

All JSON validated with `jq empty` (6/6 valid). No `.ts` files in this bundle — none are
shipped by design.

## 12. GitHub repo set up (session 4)

The generator project itself (not the generated client repos — this tool) now lives at
`https://github.com/Gopalakrishna-Ratnala/boilerplate-generator`, branch `main`. Pushed
via a fine-grained PAT (Contents: read/write only), passed as an env var, never
committed to git config or logged. **Push again after every meaningful change; tell the
user to `git pull` in VS Code to review.**

---

## 13. Full repo review (session 8) — audit before starting `generate.js`

Before starting `generate.js`, did a full cross-bundle consistency audit rather than
trusting the individual bundle reviews in isolation. Checks run:

1. **Every bundle option has all 4 contract files** (`manifest.json`,
   `deps.fragment.json`, `settings.fragment.json`, `rules/*.md`) — 14/14 clean.
2. **Every manifest's `axis`/`option` fields match their folder path**, and every
   manifest has `claudeMdSummaryLine` — 14/14 clean.
3. **Every path in every `deny` list resolves to a real shipped file** — clean, with
   `deploy-target/ssr` correctly flagged as an intentional exception (protects files
   that don't exist yet in this bundle's `files/` because they're created later by its
   `postGenerateCommands`).
4. **Every shipped `.ts` file is actually covered by its bundle's `deny` list** — found
   two real gaps, not stylistic nitpicks:
   - `data-layer/mock/files/.../mock-response.ts` was never protected, despite being
     the same class of "shared mechanism every feature depends on" as the already-protected
     `api.service.ts`/`graphql.config.ts`. **Fixed: now protected.**
   - `data-layer/rest/files/.../api.config.ts` was unprotected while its siblings
     (`graphql.config.ts`, `realtime.config.ts`) were protected, with no stated reason
     for the difference — an unexplained inconsistency, not a deliberate exception.
     **Fixed: now protected, matching the sibling pattern.** Both fixes also updated
     the corresponding `rules/*.md` files so the documentation matches the actual
     enforcement (previously `rest/rules/data-layer.md` said `api.config.ts` was just
     "reads the base URL" without noting protection — now corrected).
5. **Every `settings.fragment.json` only ever uses the `deny` key** — consistent,
   confirmed across all 14 (none use `allow`/`ask`, which was never actually needed).
6. **Every `rules/*.md` file follows the exact 4-header template** (`What pattern is
   used` / `What the AI agent may do` / `What the AI agent must NOT do` / `Where the
   code lives`) — 14/14 consistent. `ngrx-signalstore` has one extra header prepended
   (the compatibility warning) — a deliberate, justified addition, not a break in the
   template.
7. **Full JSON validation and TypeScript syntax check across the entire repo in one
   sweep** (not just per-bundle as each was built) — clean.
8. **`CLAUDE.md` placeholder tokens are spelled identically everywhere they're used** —
   checked `{{SELECTOR_PREFIX}}` appears identically in both `CLAUDE.md` and
   `architecture.md` (a silent mismatch here would mean `generate.js`'s find-replace
   fills in one file and misses the other). Full placeholder set `generate.js` must
   fill: `{{PROJECT_NAME}}`, `{{ONE_LINE_PROJECT_DESCRIPTION}}`, `{{ANGULAR_VERSION}}`,
   `{{TS_VERSION}}`, `{{PACKAGE_MANAGER}}`, `{{SELECTED_BUNDLES_LIST}}`,
   `{{SELECTOR_PREFIX}}`.
9. **Two stray empty folders found and removed** (leftovers from early `mkdir -p
   .../{a,b,c}/` brace-expansion mistakes: one under `auth/`, one under
   `data-layer/`) — both were empty, never tracked by git, no functional impact, but
   worth a final sweep before building `generate.js` so it doesn't get confused by
   stray directories.

**Takeaway carried into `generate.js`:** the per-bundle review discipline (test each
bundle as it's built) is necessary but not sufficient — a cross-cutting sweep after
several bundles exist catches inconsistencies that only show up when comparing bundles
against each other, not when reviewing one at a time. Worth repeating this kind of full
audit again after `generate.js` exists and after the Claude Code skill wraps it.

## 14. `scripts/generate.js` — ✅ built and genuinely end-to-end tested (session 9)

**A sandbox constraint shaped the testing approach, documented honestly:** this
sandbox's Node (`v22.22.2`) is one patch version short of what Angular CLI v22 requires
(`v22.22.3+`) — a hard engine check. `ng new`/`ng add` could still run here via `npx`
resolving a compatible Angular version automatically (it resolved **v21.2.19**, not the
true npm "latest" of 22.0.6) — enough to genuinely exercise every code path in
`generate.js` (scaffold → merge → collision-check → post-generate commands → npm install
→ git → push), just not against the exact Angular version a real machine with correct
Node would get. **Anyone running this on a real machine should verify against actual
Angular 22 once, since this was never tested against that exact version.** Push
mechanics were tested against a local bare git repo (`git init --bare`) instead of real
GitHub, plus a standalone unit test of the token-injection/redaction string logic — both
passed; real GitHub push was already proven working manually earlier in this session
(§12) using the identical code pattern.

**Real bugs found and fixed by actually running the script repeatedly, not by reading
it and assuming it was correct:**

1. **Path-flattening bug in the bundle-files copier (serious — would have silently
   corrupted every generated project).** The recursive copy function computed each
   file's destination path relative to the *current* recursion level instead of the
   original `files/` root, losing one path segment per directory depth. First test run
   showed zero files under `src/app/core/` and instead scattered `auth.service.ts`,
   `api.service.ts`, etc. flat at the project root and in wrongly-shallow folders. Fixed
   by threading the original root through recursion as a separate, unchanging parameter
   and always computing relative paths against it. Re-tested and confirmed correct
   nested placement across 3 different bundle combinations, including the
   `oauth-sso`+`graphql`+`ngrx-signalstore`+`rbac` combination (6 config/service files
   correctly placed, zero collisions, `package.json` deps correctly merged with no
   duplication).
2. **`--dry-run` didn't actually skip `postGenerateCommands`.** `deploy-target/ssr`'s
   `ng add @angular/ssr` ran a real, live network install even with `--dry-run=true` —
   defeating the point of a dry run. Fixed by checking the flag before running
   post-generate commands, printing what *would* run instead. Confirmed fixed: a
   second dry-run test showed no `server.ts` created (correctly skipped) vs. the first
   real run, which genuinely scaffolded `server.ts`, `app.config.server.ts`,
   `app.routes.server.ts` and updated `angular.json`/`package.json`/`app.config.ts` —
   a full, successful real-world exercise of the `postGenerateCommands` mechanism.
3. **Misleading error message on a pre-existing-directory collision.** An early test
   accidentally re-ran into a directory from a previous test run; the failure was
   reported as "likely a Node version problem" when the real cause was unrelated
   (directory already exists). Fixed: `generate.js` now checks for and reports an
   existing target directory explicitly, before ever invoking `ng new`.

**What was verified working, specifically, via real runs (not just code review):**
- `requires` validation genuinely blocks an invalid combination (`roles: rbac` +
  `auth: none`) before touching disk — confirmed exit code 1, confirmed no directory
  created.
- `knownIssues` warnings genuinely print (confirmed `ngrx-signalstore`'s Angular-version
  note appears verbatim before scaffolding begins).
- Collision detection genuinely fires — tested directly with a synthetic scratch
  scenario (two fake bundles shipping the same file path); correctly refused with a
  clear message rather than silently overwriting.
- `.claude/settings.json` deny-array merging is correct across `base/` + 2 bundles at
  once, with no duplicates, verified by inspecting actual merged JSON in a generated
  project (not just trusting the merge code).
- Real `npm install` (467 packages, 0 vulnerabilities) and a real `git push` to a bare
  repo both completed successfully end-to-end in one full run.
- Hook scripts' executable permission survives the copy (`chmod 755` explicitly applied
  after copy, since plain file copy doesn't guarantee mode bits survive).

**Known limitation carried forward, not silently ignored:** `ng new`'s own internal git
init/commit (which happens automatically as part of the CLI's scaffolding) emitted an
"Author identity unknown" warning in this sandbox because no global git user is
configured here. This is expected to be a sandbox-only artifact — any real developer
machine already has `git config --global user.email/name` set — but if it somehow
recurs on a real machine, `generate.js`'s own later `git init` + explicit local
`user.email`/`user.name` config (run unconditionally, before its own commit) is
unaffected by whatever `ng new` did or didn't manage to commit internally; only one
commit exists on the `main` branch in every test that was run (confirmed via `git log`
each time).

## 15. Immediate next step (where to resume) — `generate.js` done, the Claude Code skill is next

Build `.claude/skills/new-angular-project/SKILL.md` — the conversational wrapper:
1. Asks the 5 fixed-axis questions (Case 1 phrasing exists in §5; Case 2 still not
   drafted — see below).
2. Asks the open/cosmetic axis questions (theme, component library shortlist, etc. —
   never formally drafted this session; still needs a menu, not just "ask freely").
3. Asks for `--project-name` and `--repo` (the target empty GitHub repo URL).
4. Calls `node scripts/generate.js` with the corresponding flags — **the skill itself
   must not hand-assemble any files**; its only job is conversation + dispatch, per the
   deterministic-core decision in §2.
5. Surfaces `generate.js`'s own output back to the user as-is (including any
   `knownIssues` warnings or validation failures) rather than summarizing/hiding them.

After the skill: draft Case 2 (non-technical client) question phrasing — still not
started, tracked since §5 was written.

**Before considering the whole system done:** run the full audit pattern from §13 one
more time now that `generate.js` and the skill both exist — cross-bundle consistency
checks catch different things than component-level testing does, and this has been true
every time it was tried this session.

