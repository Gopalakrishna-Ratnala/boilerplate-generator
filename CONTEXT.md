# Project Context: Angular Boilerplate Generator

> Purpose of this file: let anyone (including a future AI session) pick up exactly where
> this left off, without re-deriving the reasoning from scratch. Update this file at the
> end of any session that makes a new decision or changes direction.

**Last updated:** 2026-07-13 (session 5)
**Status:** `base/` layer + `auth` bundle (session 3) + `data-layer` bundle (session 4) +
`state` bundle (session 5) built and tested. Project pushed to GitHub:
`https://github.com/Gopalakrishna-Ratnala/boilerplate-generator` (branch `main`). Push
after every meaningful change going forward; user pulls in VS Code to review.
Remaining: `roles`, `deploy-target` bundles, then `generate.js`, then the Claude Code
skill, then Case 2 question phrasing.

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
│   ├── roles/{single-role, rbac}/                           # ❌ NOT YET BUILT
│   └── deploy-target/{spa, ssr}/                            # ❌ NOT YET BUILT
└── scripts/
    └── generate.js                # ❌ NOT YET BUILT — the deterministic merge+push script
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

## 10. GitHub repo set up (session 4)

The generator project itself (not the generated client repos — this tool) now lives at
`https://github.com/Gopalakrishna-Ratnala/boilerplate-generator`, branch `main`. Pushed
via a fine-grained PAT (Contents: read/write only), passed as an env var, never
committed to git config or logged. **Push again after every meaningful change; tell the
user to `git pull` in VS Code to review.**

---

## 11. Immediate next step (where to resume)

Build the remaining 2 bundles — `roles` → `deploy-target` — same rigor as prior
bundles:
1. Follow `bundles/BUNDLE-CONTRACT.md` exactly, including the `knownIssues` manifest
   field when a real compatibility caveat exists.
2. Check any real package version (and its peer dependencies) against the live npm
   registry, not memory.
3. Syntax-check every `.ts` file with `tsc --noEmit`, validate every `.json` with
   `jq empty`.
4. Isolate any sensitive/shared config into its own protectable file when it would
   otherwise sit inside a file that also needs to stay editable (the `oauth.config.ts`
   pattern).
5. If a real, unresolved compatibility/design trade-off surfaces (like the
   `ngrx-signalstore` Angular-version mismatch), **ask the user rather than deciding
   unilaterally** — this has been the pattern all session and should continue.
6. Push to GitHub after the bundle is done and tested.

After both bundles: build `scripts/generate.js`, then the `new-angular-project` Claude
Code skill, then draft Case 2 (non-technical client) question phrasing.

