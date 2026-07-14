# Project Context: Angular Boilerplate Generator

> Purpose of this file: let anyone (including a future AI session) pick up exactly where
> this left off, without re-deriving the reasoning from scratch. Update this file at the
> end of any session that makes a new decision or changes direction.

**Last updated:** 2026-07-14 (session 14)
**Status:** User provided two reference templates (`ai-ready-react-template` and its
Angular port, `ai-ready-angular-template`) — existing company convention for `.claude/`
structure. Compared both against our system in depth. Adopted 4 concrete improvements:
2 new content-based hooks ported from React (framework-agnostic, straight port), 2
deliberately **re-adapted for Angular** rather than blindly copied (a blanket
`<div>`/`<span>` ban would be wrong for Angular; a shadcn-specific color-token
convention doesn't apply since we don't mandate a UI library). Also added a
consolidated anti-patterns/validation-checklist file, another pattern found in the
reference templates. **2 real bugs found and fixed while testing the new hooks** — not
just "does it run," but real block/pass verification, same discipline as everything
else. Pushed to GitHub:
`https://github.com/Gopalakrishna-Ratnala/boilerplate-generator` (branch `main`).

---

## 1. The problem being solved

Conventional flow: PO + Designer gather requirements from the client → finalize design →
**then** hand off to developers, who only start coding after that handoff. Serial,
slow.

**Goal:** shift left. A technical person (developer) generates a correctly-configured,
guardrailed Angular project — informed by the client requirements already gathered —
**and hands that repo to the Designer/PO**, who then works *inside* it using their own
AI coding agent (Claude, Codex, Copilot) in parallel with further design/requirements
work, instead of waiting for a full separate development phase to start. By the time the
client signs off on the design, working code already exists.

**Clarified handoff sequence (confirmed explicitly by the user, session 15):**
1. Technical person generates the boilerplate (via `generate.js` directly, or the
   `new-angular-project` Claude Code skill) — this step is developer-facing, not
   something the non-technical person operates themselves.
2. The generator produces and pushes a fully guardrailed repo — `.claude/` config,
   hooks, and rules already in place before anyone else touches it.
3. **The non-technical person (Designer/PO) then works inside that already-generated
   repo**, using their own AI agent — protected by guardrails a developer already set
   up, not guardrails they configure themselves.

**The risk this creates:** Designers aren't developers. Left alone with an AI agent
inside that handed-off repo, they (and the agent) could make bad architectural
decisions, pick wrong dependencies, or produce code inconsistent with how the dev team
actually builds — creating a mess for developers to inherit, instead of a head start.
This is exactly why the guardrails are baked in structurally at generation time (step 1)
rather than relying on the person in step 3 to configure or maintain them correctly.

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
- Rationale: this keeps the part of the system that produces the actual guardrail
  config (`generate.js`'s deterministic assembly) separate from conversation/judgment
  calls — even though the skill's *operator* is the technical person (per the
  clarified handoff sequence above), not the non-technical person, deterministic
  assembly still matters: it means every generated repo with the same answers is
  byte-for-byte identical, regardless of how the conversation leading up to it went.

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
│           └── SKILL.md           # ✅ BUILT (session 10) — includes Case 1 + Case 2 phrasing
├── base/                          # ✅ BUILT — always-included in every generated repo
│   ├── CLAUDE.md
│   ├── .mcp.json                  # ✅ BUILT (session 11) — Angular CLI MCP server for Claude Code
│   └── .claude/
│       ├── settings.json
│       ├── rules/
│       │   ├── angular.md
│       │   ├── architecture.md
│       │   ├── security.md
│       │   ├── error-handling.md  # ✅ BUILT (session 11)
│       │   └── accessibility.md   # ✅ BUILT (session 11)
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
│   ├── deploy-target/{spa, ssr}/                            # ✅ BUILT
│   ├── i18n/{single-language, multi-language}/               # ✅ BUILT (session 12)
│   └── offline/{standard, pwa}/                              # ✅ BUILT (session 12)
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

## 5. Question lists — Case 1 (technical) and Case 2 (non-technical), both now built into the skill

**Both cases are now written out in full inside
`.claude/skills/new-angular-project/SKILL.md`** (session 10) — that file is the
canonical, current source since it's what actually runs; the summary below is historical
context only, kept for quick reference, not the thing to edit going forward.

Case 1 (drafted session 2):
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

Plus, always: project name and the empty GitHub repository URL to push to.

Case 2 (drafted session 10, plain-language analogies instead of technical terms — see
`SKILL.md` for exact wording): asks the same 5 decisions but framed as "how do people
get into your app," "where does your information come from," "does information follow
someone between screens," "do all users see the same thing," "does this need to show up
in Google search." Each maps to the identical bundle flags as Case 1 — the phrasing
differs, the underlying options don't.

**Open items still not fully resolved (carried forward, not blocking):**
- Q3/Q4 are the most likely to get "not sure" from even a technical client. The skill
  now has a **partial answer for one such case**: if `rbac` is selected with `auth:
  none`, the skill is instructed to flag the contradiction and ask the person to
  resolve it, rather than silently picking one (this is also independently enforced by
  `generate.js`'s `requires` validation — two layers, same as the file-protection
  pattern elsewhere in this project). The general "what if the client is unsure"
  question for axes without a hard constraint (e.g. Q3, state complexity) is still not
  resolved — the skill currently just asks and takes whatever answer comes back.
- Current phrasing is still single-select per axis. Multi-select (e.g. "no auth for
  public pages + OAuth for admin area") remains deliberately deferred — `generate.js`'s
  bundle-merging logic was built and tested assuming exactly one option per axis; adding
  multi-select would need real design work, not just a skill wording change.

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

## 15. `new-angular-project` skill — ✅ built (session 10), including Case 2 phrasing

`.claude/skills/new-angular-project/SKILL.md` is written. What it does and what was
checked:

- **States its own scope restriction up front**: it must never hand-assemble project
  files itself — only ask questions and call `generate.js`. This is written directly
  into the skill's instructions, not just implied.
- **Includes both Case 1 and Case 2 phrasing for all 5 fixed-axis questions.** Case 2
  (non-technical) was drafted for the first time this session — plain-language
  analogies ("how do people get into your app," "does information follow someone
  between screens") instead of technical terms, mapping to the exact same bundle flags
  as Case 1.
- **Cross-checked every flag name and option value against the real `generate.js` and
  real bundle folder names** (not just written from memory) — confirmed exact matches
  for all 5 axes' option values (`none/basic-auth/oauth-sso/saml`,
  `mock/rest/graphql/realtime`, `signals-only/ngrx-signalstore`, `single-role/rbac`,
  `spa/ssr`) and all flag names (`--project-name`, `--repo`, `--description`,
  `GITHUB_TOKEN`). A skill with drifted flag names would fail confusingly at runtime
  with no clear signal why — checked this before considering it done, the same
  discipline applied to bundle protection paths in §13.
- **Validated the YAML frontmatter actually parses** (`name`/`description` fields
  present and well-formed) — a skill can't be discovered by Claude Code at all if this
  is malformed, so this was checked directly rather than assumed from visual
  inspection.
- **Handles the `rbac` + `auth: none` contradiction at the conversation layer too** —
  told explicitly to catch this and ask the person to resolve it, as a second,
  earlier-in-the-flow layer on top of `generate.js`'s own `requires` validation (same
  "worth two independent checks" pattern as the file-protection hooks in `base/`).
- **Open/cosmetic questions (theme, component library, etc.) are asked but deliberately
  don't map to bundle flags** — they get folded into `--description` as freeform notes,
  not turned into new pseudo-bundles. Inventing new bundle types for purely cosmetic
  choices would have been scope creep beyond what §2's fixed/open axis split actually
  calls for.

**What could not be tested here, honestly:** a skill is a prompt, not executable code —
there's no way to "run" it standalone the way `generate.js` was end-to-end tested. Real
validation of this skill only happens the first time someone actually uses it inside a
live Claude Code session and walks through the conversation for real.

## 16. Scope correction (session 11): this is the company standard, not "5 axes and done"

The user corrected the framing this session: the goal was never "answer 5 client
questions and ship a repo" — it's **the company's actual Angular standard**, and the 5
fixed axes were the first slice of that, not its ceiling. This reframed how gaps found
by reviewing angular.dev should be triaged:

- **Category A — universal, always-on, no client input needed.** These belong directly
  in `base/`, applied to every generated project regardless of which bundles get
  selected. Fixed this session (see §17 below).
- **Category B — real per-project decisions with actual trade-offs**, deserving to
  become new fixed axes alongside the existing 5 (candidates: internationalization,
  PWA/offline support). **Not yet built** — would require extending `generate.js`'s
  `AXES` array, new bundle folders following `BUNDLE-CONTRACT.md`, and new
  skill questions. Bigger, more invasive change than Category A; deliberately deferred
  to its own session rather than rushed in alongside the base-layer fixes.
- **Category C — genuinely cosmetic**, stays out of the bundle system entirely
  (Tailwind-as-styling-choice, drag-and-drop, web workers).

## 17. Category A fixes — ✅ built and tested (session 11)

Found by fetching and reading angular.dev's actual current doc structure (not from
memory) and cross-checking every section against what we'd built. Three real findings,
one of them a serious one:

1. **Real, already-shipped bug: ESLint was never scaffolded.** `ng new` in the current
   Angular CLI does **not** create `eslint.config.js` by default — confirmed by
   inspecting actual `generate.js` test output, not assumed. This meant every project
   generated by this system so far had a `CLAUDE.md` that instructs `ng lint` and claims
   "Lint: ESLint" as a locked constant, while the command would have actually failed.
   **Fixed**: added a new `BASE_POST_GENERATE_COMMANDS` mechanism to `generate.js`
   (distinct from a bundle's `postGenerateCommands` — this one is universal, not tied to
   any axis selection) that runs `ng add @angular-eslint/schematics --skip-confirmation`
   for every generated project. **Verified fixed**: real (non-dry-run) test showed
   `eslint.config.js` created and `ng lint` actually passing afterward — this is the
   first time this exact command was verified to work at all.
2. **Second bug found while fixing the first**: the ESLint schematic hardcodes
   `prefix: 'app'` in its generated selector-naming rules, but this project's own
   `{{SELECTOR_PREFIX}}` placeholder (used in `CLAUDE.md`/`architecture.md`) can be
   customized per project. Left alone, a custom-prefix project would ship a lint rule
   actively contradicting its own documented convention. **Fixed**: added
   `fixEslintSelectorPrefix()`, a post-processing step using the exact same
   `selectorPrefix` value already computed for the placeholder system — single source of
   truth, not a second place to configure it. **Verified**: tested with
   `--selector-prefix=acme`, confirmed both `component-selector` and
   `directive-selector` rules in the generated `eslint.config.js` read `'acme'`, not
   `'app'`.
3. **`.mcp.json` was researched extensively (original research report called it "the
   single highest-leverage Angular-specific integration") but never actually shipped.**
   Confirmed via angular.dev's own MCP setup guide that `ng new` only auto-creates
   `.vscode/mcp.json` (for VS Code/Cursor) — **not** a project-root `.mcp.json`, which is
   what Claude Code specifically reads. **Fixed**: added `base/.mcp.json` (the
   `angular-cli` MCP server config) and wired `generate.js`'s `applyBase()` to copy it
   into every generated project. **Verified**: confirmed present and correctly-formed in
   test output.

Two new rule files added (verified copied automatically into every generated project via
the existing generic recursive copy — no `generate.js` code change needed for this part,
confirming the base-layer copy mechanism is genuinely generic):

4. **`base/.claude/rules/error-handling.md`** — documents `provideBrowserGlobalErrorListeners()`
   (confirmed present by default in generated `app.config.ts` by direct inspection, not
   assumed from Angular's docs alone), the call-site-first error-handling principle, and
   the pattern for wiring a custom `ErrorHandler` to an error-tracking service without
   the agent inventing credentials/service choice itself.
5. **`base/.claude/rules/accessibility.md`** — Angular's official a11y guidance:
   ARIA attribute binding conventions, focus management after route navigation,
   `aria-current` via `ariaCurrentWhenActive`, `@defer` + ARIA live regions, and reusing
   native elements over reimplementing their behavior. Notes that
   `angular.configs.templateAccessibility` is **already included by default** by the
   ESLint schematic (discovered while inspecting the generated `eslint.config.js` for
   the prefix fix above) — so template-level a11y lint enforcement was a free side
   effect of fixing bug #1, not separately built.

**Testing discipline maintained**: every fix here was verified with a real
(non-dry-run) `generate.js` run, not just read for plausibility — consistent with every
other piece of this project. Full JSON validation re-run across the whole repo after
these changes (all valid); `generate.js` syntax re-checked.

## 18. Category B — ✅ built and tested (session 12): system extended from 5 to 7 axes

Two new fixed axes added, following `BUNDLE-CONTRACT.md` exactly: **`i18n`**
(`single-language` / `multi-language`) and **`offline`** (`standard` / `pwa`).
`generate.js`'s `AXES` array extended, the skill's questions extended (both Case 1 and
Case 2 phrasing for both new axes), `CLAUDE.md`'s `--i18n`/`--offline` flags added.

**Both new "real" options followed the `deploy-target/ssr` precedent** (schematic-driven
via `postGenerateCommands`, not hand-written files) — verified by actually running each
schematic before deciding to use it, not assumed:
- `i18n: multi-language` → `ng add @jsverse/transloco --skip-confirmation`. Verified
  this schematic exists and genuinely works by running it directly; it even auto-wires
  `app.config.ts` (better than the hand-copy approach used for `auth`/`data-layer`
  bundles). **Deliberate, documented choice**: Transloco (runtime-switchable) over
  Angular's own `@angular/localize` (compile-time, separate build per locale) — recorded
  in the manifest's `knownIssues` field as a visible, correctable decision rather than a
  silent one, since most real client "multi-language" requests mean an in-app switcher
  with no rebuild, not locale-specific URLs.
- `offline: pwa` → `ng add @angular/pwa --skip-confirmation`. Same verify-before-use
  discipline.

**Protection judgment calls, each reasoned independently rather than pattern-matched:**
- `transloco.config.ts` and `transloco-loader.ts` protected (set-once bootstrap,
  matching the `oauth.config.ts`/`server.ts` pattern) — but `public/i18n/*.json`
  (the actual translation strings) deliberately left **editable**, since new keys are
  added constantly, matching the `app.routes.server.ts` "don't protect what's routinely
  extended" reasoning.
- `ngsw-config.json` (PWA caching strategy) **protected**, breaking from the
  "routinely-edited files stay open" pattern used for `app.routes.server.ts` — reasoned
  independently: caching-strategy mistakes cause a specific, high-consequence,
  hard-to-diagnose bug class (real users silently seeing stale content), and changes to
  it are infrequent, not routine — a different risk/frequency trade-off than adding a
  new SSR route, so it gets the opposite protection decision.

**Two more real bugs found — by combining all 7 axes in one real test and running
`ng lint` + `ng test`, not just generation:**

1. **A bug in the Category A ESLint-prefix fix from the previous session, only
   surfaced now.** That fix corrected the *lint rule's* expected selector prefix but
   never touched the *actual root component* (`app.ts`'s `selector: 'app-root'`) or
   `index.html`'s `<app-root>` usage — both still hardcoded to `'app'` by `ng new`
   regardless of the project's real prefix. Every single project generated by this
   system, even before this session (since the default prefix is derived from the
   project name, not literally `'app'`), would have failed its own lint immediately.
   **This was caught by running `ng lint` on a real combined-bundle output** — the
   original fix's own testing (session 11) only checked the lint *rule text* changed,
   not that the actual scaffolded files conformed to it. Fixed: renamed
   `fixEslintSelectorPrefix` to `fixSelectorPrefix`, expanded to also rename
   `app.ts`'s selector and `index.html`'s tag usage. **Verified**: re-ran the full
   7-axis combination, confirmed `ng lint` → "All files pass linting," confirmed
   `ng test` → both tests pass, confirmed a real `ng build` succeeded as part of the
   test run.
2. **A small, unrelated pre-existing bug in the `data-layer/rest` bundle**: a stray
   `// eslint-disable-next-line no-console` comment above a `console.error(...)` call,
   for a rule (`no-console`) that was never actually enabled in this project's real
   ESLint config — causing an "unused eslint-disable directive" lint warning on every
   project using `data-layer: rest`. Removed.

**This is now the most thoroughly validated single combination in the whole project** —
not just "does `generate.js` run without crashing" (the earlier bar), but a real
`ng build`, `ng lint`, and `ng test`, all passing, on a project combining 2 CLI
schematics stacked on top of each other (`ng add @jsverse/transloco` then
`ng add @angular/pwa`) plus 5 hand-copied bundles. Worth repeating this exact
build+lint+test discipline (not just "does generation succeed") for any future bundle
work — it caught something the lighter checks didn't.

Full JSON validation re-run across the entire repo after all changes — clean.

## 19. angular.dev deep-dive (session 13) — user requested a drill-down across the whole site

User asked for a systematic review of angular.dev's remaining sections not yet covered,
specifically to find gaps that affect "standard and reliable code" — not just process
gaps like the earlier `.mcp.json`/ESLint findings, but actual code-correctness/security
content. Findings, most severe first:

**🔴 Critical — `security.md` had almost none of Angular's own security model.**
The file (session 3) covered company file-protection rules (which paths the agent can't
touch) but nothing about *how Angular itself prevents real vulnerabilities* in the code
being written — a file titled "security" that never mentioned XSS, sanitization, or
CSRF is a significant gap for a system whose whole point is "reliable, standard code."
**Fixed**: restructured into two clearly-labeled parts (same "official guidance vs
house rules" separation used elsewhere) — Part 1 unchanged company rules, **new Part 2**
sourced from angular.dev/best-practices/security:
- Angular's default auto-sanitization model, and that `DomSanitizer`'s
  `bypassSecurityTrust*` methods are Angular's own documentation's "Security Risk"
  flagged APIs — the agent is told to stop and flag human review before using any of
  them, not use them to "fix" a rendering issue.
- CSP/Trusted Types as defense-in-depth (brief, since it's an infra/backend concern this
  repo doesn't control directly).
- **`HttpClient`'s automatic CSRF/XSRF protection** (cookie→header token forwarding) —
  the agent is told not to call `withNoXsrfProtection()` casually, and to use
  `withXsrfConfiguration()` rather than hand-rolling token-forwarding logic if the
  backend uses different cookie/header names.
- XSSI protection (informational — already automatic).

**🔴 Also critical, bundle-specific: SSRF protection for `deploy-target/ssr`.**
Angular's Node SSR engine has real `allowedHosts`/`trustProxyHeaders` protections
against host-header-injection SSRF attacks — not mentioned anywhere in the `ssr`
bundle. **Fixed**: added a dedicated section to `deploy-target/ssr`'s own rule file
(not just the generic `security.md`, since this is specific to how `server.ts`'s
`AngularNodeAppEngine` is configured) — explicitly warns against `allowedHosts: ['*']`
and casually setting `trustProxyHeaders: true`.

**🟡 Moderate — smaller but real additions to `angular.md`:**
- **Event handler naming convention** from Angular's own style guide: name handlers for
  what they do (`commitNotes()`), not the triggering event (`onKeydown()`); use
  Angular's key-event modifiers (`(keydown.control.enter)`) over hand-checking
  `event.key`/`event.ctrlKey`.
- **Testing section expanded** with the concrete, currently-correct `HttpClient` testing
  pattern (`provideHttpClientTesting()` + `HttpTestingController`, verified current —
  `HttpClientTestingModule` is deprecated) — the previous version just said "use Vitest"
  with no pattern for the single most common thing a generated project's tests need to
  do (test something that calls `HttpClient`).
- **Forms section expanded**: validator composition guidance (prefer built-ins, keep
  custom validators pure) and the `ControlValueAccessor`/`NG_VALUE_ACCESSOR` pattern for
  custom form controls — previously just said "prefer Reactive Forms" with no actual
  pattern.
- **Angular Aria mention** added to `accessibility.md` — check for an existing
  accessible primitive before hand-rolling ARIA/keyboard-navigation logic for a custom
  widget with no native element equivalent (combobox, tree view, tabs).

**Verified, not just written:** full JSON validation re-run (unaffected, only `.md`
files changed), `generate.js` syntax re-checked, and a full end-to-end
`deploy-target:ssr` + `data-layer:rest` generation run to confirm all 12 rule files
(including the substantially-expanded `security.md`, now 141 lines vs. the original 66)
copy completely and the new SSRF section is actually present in the generated output —
not just present in the source bundle.

**Explicitly deferred, not silently dropped:** deeper drill-downs into Signals internals
(`linkedSignal`, `resource`), Routing (resolvers, guards beyond what's already covered),
Directives, and DI (hierarchical providers, injection tokens) were not done this
session — flagged as candidates for a future pass if real use surfaces a need, same
"don't build ahead of demonstrated need" principle applied throughout this project.

## 20. Reference template comparison (session 14) — user's existing company convention

User provided two zips: `ai-ready-react-template` (the original) and
`ai-ready-angular-template` (its Angular port — the Angular one's own README states it
"mirrors the structure and intent of the company's `ai-ready-react-template`"). Both
examined in full depth before deciding anything.

**Core architectural difference, deliberately NOT changed:** their model is one
template repo where all strategy options (state management, styling, rendering mode)
coexist as documented choices, and a human deletes what they don't need after cloning.
Ours generates a fresh repo with only the selected option's files/rules present,
decided *before* generation via questions. **Kept our approach** — their model assumes
a developer sets the project up; ours was built specifically around a non-technical
person driving the AI agent pre-developer-handoff, which is the entire reason this
system exists. Structural impossibility (the wrong option never gets generated) beats
trusting a human to delete the right folders, for that specific constraint.

**What WAS adopted, in each case checked against whether it was genuinely portable
or React/JSX-specific before copying anything:**

1. **`check-tsc.sh`** — non-blocking `tsc --noEmit` after every `.ts` edit, debounced
   30s. Framework-agnostic (TypeScript is TypeScript) — ported directly, adapted only
   to look for Angular's `tsconfig.json` at the project root instead of walking up from
   `src/`.
2. **`check-dependency-security.sh`** — blocks `git commit` if `npm audit` finds any
   vulnerability. Completely framework-agnostic (npm is npm) — ported as-is.
3. **`check-interactive-div-span.sh`** — **deliberately NOT a direct port.** The React
   version blocks ALL `<div>`/`<span>` use, which is correct for their
   shadcn/Radix-primitive-first convention but would be **wrong** for Angular, where
   div/span are normal, correct choices for pure layout. Re-scoped to match what
   `accessibility.md` (and Angular's own official guidance) actually objects to: a
   div/span given *interactive* semantics (`(click)`, `tabindex`, `(keydown)`/`(keyup)`)
   instead of a real `<button>`/`<a>` — a narrower, more accurate rule than the source.
4. **`check-hardcoded-colors.sh`** — **also deliberately re-adapted, not ported.** The
   React version's fix-it message points to shadcn-specific token names
   (`bg-primary`, `text-foreground`) because that template mandates shadcn. This system
   doesn't mandate any UI library (component-library choice is our own deferred
   Category-C cosmetic axis), so the ported version checks for the same underlying
   problem (hardcoded hex/rgb/hsl) without assuming a specific token naming scheme, and
   explicitly exempts a CSS custom-property *definition* line (the legitimate place a
   literal color value belongs) rather than every literal color anywhere.
5. **`anti-patterns-checklist.md`** — a consolidated, skimmable auto-reject list +
   final validation checklist, cross-referencing rules that already exist elsewhere
   rather than introducing new ones. Same pattern found in both reference templates.

**Correctly left un-ported, and why:** `check-no-any` (they moved this to a real ESLint
rule instead of a hook in their own Angular port — we already have the ESLint-level
equivalent via `@angular-eslint/schematics`, no gap here). `check-barrel-exports`,
`check-component-files` (React/Storybook-specific: `index.ts` re-export convention and
a mandatory `.stories.tsx` per component — neither applies to how this system
structures Angular projects). `check-no-inline-classnames/style`, `check-no-sx-prop`
(JSX/MUI-specific styling mechanisms with no Angular equivalent).

**Testing discipline maintained, and it paid off again:** every new hook tested with
real block/pass payloads before being accepted, not just read for plausibility. **Two
real bugs found and fixed during testing:**
- `check-hardcoded-colors.sh`'s exclusion for legitimate custom-property *definitions*
  didn't work — the exclusion regex was applied *after* `grep -n` had already prefixed
  each line with a line number, breaking the `^`-anchored match. Fixed by filtering
  before line-numbering, not after (same class of bug, same fix shape, as the
  `generate.js` path-flattening bug from session 9 — order-of-operations in a text
  pipeline is a recurring source of these).
- `check-dependency-security.sh` produced a nonsensical `"null vulnerability(ies)"`
  false-positive block when `npm audit` couldn't run cleanly (no `package.json`, e.g.).
  Fixed to fail *safe* (warn, allow the commit) when the vulnerability count can't be
  reliably parsed, rather than blocking on a count that was never actually determined —
  verified against 3 real cases: no-package.json (now warns, allows), a genuinely clean
  project (allows), and a project with a real installed vulnerable package
  (`lodash@4.17.4`, confirmed via direct `npm audit` inspection) — correctly blocks with
  accurate counts.

Full JSON validation and a real end-to-end `generate.js` run (not dry-run) confirmed:
7 hooks now present (up from 3), 13 rule files (up from 12), `settings.json` correctly
wired, and — critically — the new interactive-div-span hook actually fires correctly
when invoked from *within* the real generated project's own file tree, not just in
isolation.

## 21. Where things stand — Category A, B, the security deep-dive, and reference-template comparison all done

1. **Real-world use** — still the most valuable next step, unchanged in priority from
   before. The user should run `generate.js` directly and try the skill in a live
   Claude Code session.
2. **Verify against true latest Angular (22.x)** on a real machine — still the single
   biggest untested gap. Every schematic used this session (`@angular-eslint/schematics`,
   `@jsverse/transloco`, `@angular/pwa`) resolved a compatible version automatically in
   this sandbox rather than the literal latest, for the same Node-version reason noted
   since session 9.
3. **Re-run the full audit pattern from §13** — now covering 7 axes across 18 total
   bundle options (up from 10) — this has caught something new literally every time
   it's been tried, no reason to expect that stops now.
4. Multi-select per axis, the open-axis "unsure" default behavior, other previously
   flagged "not fully resolved" items, and any further Category B candidates (the
   original gap list mentioned animations complexity as a possible third new axis, not
   pursued this session) remain open — revisit only if real use surfaces a need.

