# Project Context: Angular Boilerplate Generator

> Purpose of this file: let anyone (including a future AI session) pick up exactly where
> this left off, without re-deriving the reasoning from scratch. Update this file at the
> end of any session that makes a new decision or changes direction.

**Last updated:** 2026-07-15 (session 29)
**Status:** The user ran the first genuinely hook-active feature-building test — a
fresh Claude Code session started correctly inside `maxim-final` itself, so hooks
were actually live for the first time in this entire testing exercise. Found 4 more
real, confirmed issues. **Most important**: `check-missing-spec.sh` and
`check-tsc.sh` were designed as non-blocking warnings (print to stderr, `exit 0`) —
but Claude Code silently discards a `PostToolUse` hook's output on exit 0 (confirmed
via Claude Code's own documentation and filed GitHub issues), so these warnings had
**never been visible to anyone since either hook was built**. Fixed by exiting 1
(non-zero, non-2 — visible but non-blocking) specifically when there's something to
report. Also fixed: `check-hardcoded-colors.sh` only recognized hex/rgb()/hsl(), not
newer CSS color functions (`oklch()`/`lab()`/`lch()`/`color()`) — a real gap since
Tailwind v4's own default tokens commonly use `oklch()` — and only scanned
`.scss`/`.css`/`.html`, never `.ts`, missing color literals inside inline templates
entirely; both fixed and verified with real block/pass cases, including confirming
no false positives against this project's own real config files. Also found and
fixed a real, confirmed documentation inaccuracy: `angular.md` claimed every project
has an explicit `provideZonelessChangeDetection()` call — verified via a real fresh
v21 generation that this is simply false for v21+ (zoneless by default, zero
explicit provider anywhere) and only true for v19/v20 (where the generator adds it
deliberately) — fixed with real version-conditional content, verified for both cases.

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
│       ├── settings.json          # 12 hooks wired (session 16)
│       ├── rules/                 # 14 files
│       │   ├── angular.md         # incl. RxJS, takeUntilDestroyed, immutability (session 16)
│       │   ├── architecture.md    # incl. smart/dumb components, CanDeactivate (session 16)
│       │   ├── security.md
│       │   ├── error-handling.md
│       │   ├── accessibility.md
│       │   └── anti-patterns-checklist.md  # ✅ BUILT (session 14)
│       └── hooks/                 # 12 total (session 16)
│           ├── protect-paths.sh
│           ├── guard-bash.sh
│           ├── format-and-lint.sh
│           ├── check-tsc.sh                       # session 14
│           ├── check-dependency-security.sh       # session 14
│           ├── check-interactive-div-span.sh      # session 14, Angular-adapted
│           ├── check-hardcoded-colors.sh          # session 14, Angular-adapted
│           ├── check-for-track.sh                 # session 16
│           ├── check-hardcoded-api-url.sh         # session 16, adapted
│           ├── check-missing-spec.sh              # session 16
│           ├── check-mixed-input-apis.sh          # session 16
│           └── check-no-httpclient-in-component.sh # session 16, new
├── bundles/
│   ├── BUNDLE-CONTRACT.md         # ✅ BUILT — fixed structure every bundle follows
│   ├── auth/{none, basic-auth, oauth-sso, saml}/           # ✅ BUILT
│   ├── data-layer/{mock, rest, graphql, realtime}/          # ✅ BUILT
│   ├── state/{signals-only, ngrx-signalstore}/               # ✅ BUILT
│   ├── roles/{single-role, rbac}/                           # ✅ BUILT
│   ├── deploy-target/{spa, ssr}/                            # ✅ BUILT
│   ├── i18n/{single-language, multi-language}/               # ✅ BUILT (session 12)
│   ├── offline/{standard, pwa}/                              # ✅ BUILT (session 12)
│   └── styling/{material, primeng, tailwind, none}/           # ✅ BUILT (session 17)
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

## 21. Enterprise standards cross-check (session 16) — a self-contradiction, a critical bug, and 11 real gaps closed

User asked a different AI agent for Angular coding standards (37 numbered points + a
review checklist) and had this cross-checked against everything built. Systematically
verified each point against actual rule files (grep, not assumption) before accepting or
rejecting anything.

**Resolved: a real self-contradiction, not just a stylistic choice.** Our own
`CLAUDE.md`/`architecture.md` said "no file-type suffix — `user.ts`, not
`user.service.ts`" (current official Angular style guide), but a `find` across every
actual bundle file showed **14+ real files, zero exceptions**, all using the
traditional suffixed convention (`auth.guard.ts`, `auth.service.ts`,
`error.interceptor.ts`, etc.) — the enterprise document showed this same traditional
convention. **Resolved in favor of the already-implemented, already-tested code, not
the prose** — renaming 14+ files and every cross-file import path for a stylistic
preference would have been high-risk, low-value rework; fixing two files' prose was not.
`CLAUDE.md` and `architecture.md` updated to describe reality.

**5 more hooks added, checked against reference templates first, adapted where genuinely
needed:**
- `check-for-track.sh`, `check-missing-spec.sh`, `check-mixed-input-apis.sh` — direct
  ports (already Angular-specific in the reference template, no adaptation needed).
- `check-hardcoded-api-url.sh` — adapted: skip-list updated to this project's actual
  config file names (`api.config.ts`/`graphql.config.ts`/`realtime.config.ts`/
  `oauth.config.ts`) instead of the reference template's.
- `check-no-httpclient-in-component.sh` — new, not from either reference template:
  enforces "components depend on a service, never `HttpClient` directly"
  (`architecture.md`), which was previously prose-only.
- Hooks total: 7 → **12**.

**ESLint tightened**: `@typescript-eslint/no-explicit-any` → `error` (was `warn` by
default from the schematic, meaning `any` never actually failed `ng lint` despite our
own rule saying "never use `any`"). **A `no-console: error` tightening was tried and
reverted** — found, by actually running the full pipeline, that it breaks on Angular's
own default-generated `src/main.ts` (`.catch((err) => console.error(err))` is Angular's
own idiomatic bootstrap pattern in every CLI-generated project, not something this
system should override).

**Husky + lint-staged added to `generate.js`** (new `setupHuskyAndLintStaged()`,
Category A/universal) — uses the real `husky init` command for the tricky part (git
`core.hooksPath` wiring) rather than hand-constructing `.husky/`, then customizes the
resulting `pre-commit` to run `lint-staged` instead of husky's own default `npm test`.
**Verified for real**: the hook genuinely fired during this system's own test runs and
blocked/passed a real `git commit` based on real `eslint --fix`/`prettier` results —
not just "the files exist."

**6 rule-file additions**, each confirmed genuinely absent via `grep` before being
added (not assumed): RxJS operator guidance (avoid nested subscriptions;
`switchMap`/`mergeMap`/`concatMap`/`exhaustMap` and when each fits), `takeUntilDestroyed()`
for manual subscription cleanup (previously only mentioned inside the `realtime`
bundle, not as a general rule), immutable array/object updates, an explicit
"don't call non-trivial methods in templates" rule with the actual reasoning
(change-detection re-evaluation), the smart/container vs. dumb/presentational component
split, and a `CanDeactivate`/unsaved-changes guard pattern (previous guards only covered
auth/roles).

**The most serious bug found this session, and the reason "always run `ng build`" is
now a permanent addition to this project's testing discipline:** `src/environments/`
has not been scaffolded by `ng new` since Angular 15 — confirmed via a real generation
+ `ng build` run, which failed with `TS2307: Cannot find module
'../../../environments/environment'`. **Every project this system has ever generated
using the `rest`, `graphql`, or `realtime` data-layer bundles would have failed its
production build** — undetected across 6+ prior sessions of testing because validation
only ever ran `ng lint` and `ng test`/`ng serve`-equivalent checks, never a real
`ng build`. Vitest's transform pipeline apparently doesn't hard-fail the same way on
this particular missing-module case, which is exactly why lint+test passing was a false
signal of correctness all along.

Fixed with the same "prefer the real schematic" principle used for SSR/Transloco/PWA:
added `ng generate environments` to `BASE_POST_GENERATE_COMMANDS` (confirmed via direct
testing that this schematic exists, works, and correctly wires `fileReplacements` in
`angular.json`) — but the schematic only produces an *empty* `environment.ts`
(`export const environment = {};`), so a new `populateEnvironmentFiles()` function
fills in the actual fields every data-layer bundle's config file references
(`apiUrl`, `graphqlUrl`, `realtimeUrl`, `production`), sourced by grepping the real
bundle files rather than guessing. **Verified across all three previously-broken
bundles individually** (`rest`, `graphql`, `realtime`) — each now produces a clean
`ng build`, confirmed by inspecting the actual `dist/` output, not just a zero exit
code.

**One caught-and-fixed self-inflicted bug during this same testing pass**: an early
`str_replace` edit to `generate.js` accidentally swallowed a function signature line
(`function setupHuskyAndLintStaged(...) {`), producing a dangling brace — caught
immediately by `node --check` (the same syntax-check-after-every-edit discipline used
throughout this project), not left for a later test run to discover.

**Also encountered, correctly identified as pre-existing/expected, not new**: testing
`oauth-sso` + `graphql` together hit `angular-oauth2-oidc@22.0.2`'s peer dependency
requiring `@angular/common@>=22.0.0` against this sandbox's auto-resolved Angular
`21.2.18` — the same sandbox-Node-version limitation documented since session 9, not a
new bug. Correctly distinguished from the real bugs above by checking the actual npm
error report rather than assuming.

Full JSON validation and `generate.js` syntax check re-run clean after all changes.

## 22. Styling promoted from cosmetic to a real 8th fixed axis (session 17)

User saw the skill's actual live question flow (Step 3's cosmetic questions included
"preferred component library") and raised the same concern this project had already
flagged and deferred back in session 14: treating UI-library choice as purely cosmetic
was wrong. This time, acted on it instead of deferring again.

**System extended from 7 to 8 axes.** New `styling` axis: `material` / `primeng` /
`tailwind` / `none` — the exact same 4 options the user's own reference templates use.
`generate.js`'s `AXES` array, the skill (`Q8`, both Case 1/2 phrasing, confirmed via
flag-name cross-check against the real script), and `CLAUDE.md`'s flag list all
updated consistently.

**Every real command/package verified by actually running it before writing bundle
files — same discipline as every other schematic-backed bundle:**
- `material` → `ng add @angular/material --skip-confirmation`. Verified real: produces
  Material 3 theming (`mat.theme()` in `styles.scss`), CDK, no manual animations
  provider needed. **No dedicated theme file to protect** (schematic embeds theming
  directly in `styles.scss`, a file also used for other global styles) — documented as
  an explicit, honest limitation in the bundle's rule file rather than pretending a
  hook covers something it can't.
- `primeng` → no `ng add` schematic exists (confirmed by checking the npm package's own
  metadata) — manual install (`primeng`, `@primeuix/themes`) plus **a genuinely
  new finding from testing**: `provideAnimationsAsync()` requires `@angular/animations`
  installed explicitly, which a fresh `ng new` project does *not* include by default.
  Caught by a real failing build (`Could not resolve "@angular/animations/browser"`),
  not assumed. Theme preset isolated into a new protected `primeng-theme.config.ts`
  (same pattern as `oauth.config.ts`). **`primeng`'s peer dependency
  (`@angular/core@^21.0.7` at time of writing) lags the locked Angular version** — same
  class of issue as `state/ngrx-signalstore`, documented the same way via
  `knownIssues`.
- `tailwind` → `ng add tailwindcss` (Angular's own built-in CLI action, confirmed
  working via a real build). **Corrected a stale reference found while adapting the
  reference template's own Tailwind rules**: that template's guidance mentions
  `tailwind.config.js`, but what actually gets installed (Tailwind v4.3.2, verified)
  uses **CSS-first `@theme` configuration** in `src/tailwind.css` — no config file at
  all. Written correctly for what's actually installed, not copied from a
  now-outdated source. `@angular/cdk` added explicitly (for the mandatory
  "custom interactive widgets need CDK/ARIA underneath" rule, adapted directly from
  the reference template's own correct guidance on this point).
- `none` → unchanged pattern, no deps/files, rules only.

**A second, more general version of a bug class first seen with
`angular-oauth2-oidc`, found and fixed properly this time — not just patched for one
package.** `"*"` in a `deps.fragment.json` does not mean "resolve to whatever's
compatible with the already-installed Angular version" — it means "give me the
absolute latest version published on npm," full stop. This had already been used for
`primeng`'s bundle (`@angular/animations": "*"`) and appeared to work — but only
because `@angular/animations`'s true latest happened to equal the sandbox's installed
Angular core version at the time. **Building the `tailwind` bundle exposed the actual
bug**: `@angular/cdk": "*"` resolved to its real latest (`22.0.4`, requiring
`@angular/core ^22`) against this sandbox's installed core (`21.2.18`), producing a
genuine, correctly-flagged `npm` peer-dependency failure — confirmed via the actual
npm resolution error report, not assumed. **Fixed generically in `applyBundle()`**:
any dependency literally set to `"*"` for an `@angular/*`-scoped package is now
resolved to the exact version already declared for `@angular/core` in the project,
since Angular's own family packages release in lockstep — this fixes the bug for
`@angular/cdk`, retroactively makes the earlier `@angular/animations` fix actually
correct-by-design rather than correct-by-luck, and prevents the same class of bug for
any future bundle that adds an `@angular/*` dependency this way.

**One false alarm correctly diagnosed and ruled out, not mistaken for a real bug:** the
`material` bundle's build failed with `Inlining of fonts failed... returned status
code: 403` — confirmed via `grep` that Material's own official schematic adds a Google
Fonts `<link>` to `index.html` by default (expected, standard behavior), and the
failure is this **sandbox's network egress proxy blocking `fonts.googleapis.com`**
(not in the allowed-domains list), not a real generator bug. Verified by disabling font
inlining as a test-only workaround and confirming the rest of the build was completely
clean — isolating the sandbox limitation from anything the bundle itself did wrong.

All 4 styling options verified end-to-end: real generation, real `ng lint` (all clean),
real `ng build` (all clean, material's font-inlining caveat aside), and for `primeng`
specifically, the full intended manual-wiring pattern (`providePrimeNG` +
`provideAnimationsAsync` in `app.config.ts`) was manually completed and built
successfully — not just the isolated config file in a vacuum.

Full JSON validation and `generate.js` syntax check re-run clean after all changes.

## 23. Version-gated bundling built and tested for Angular 19–22 (session 18)

User asked which Angular version this system targets, then asked whether bundling could
be made version-aware. Answered with real research first (not assumed), then — given
the user chose "all 4 versions, full range" — actually built and tested it, using
`generate.js`'s pre-existing `--angular-version` flag to pin real CLI versions rather
than relying on this sandbox's auto-resolution (which had been stuck at whatever
version `npx` picked since session 9).

**Scope decision, made explicitly rather than assumed:** version support is a
`generate.js` **flag** (developer/power-user escape hatch — e.g. "this client's infra
requires an older Angular"), not a new question in the `new-angular-project` skill's
conversational flow. Adding version choice to the client-facing conversation would
contradict this system's whole premise of generating against one locked company
standard. `SKILL.md` deliberately left unchanged.

**Contract extended**: new optional `minAngularMajor`/`maxAngularMajor` fields on any
bundle manifest (documented in `BUNDLE-CONTRACT.md`, same pattern as `requires` and
`knownIssues`). Applied to the three bundles with real, already-known peer-dependency
floors:
- `auth/oauth-sso`: `minAngularMajor: 22` (`angular-oauth2-oidc` needs `@angular/core >=22.0.0`).
- `state/ngrx-signalstore`: `minAngularMajor: 21, maxAngularMajor: 21` (`@ngrx/signals`
  needs exactly `^21.0.0`).
- `styling/primeng`: `minAngularMajor: 21, maxAngularMajor: 21` (`primeng`'s
  `^21.0.7` is a caret range — v21 only, not v22+, corrected from an earlier session's
  looser "may lag behind" phrasing now that this is precisely known and hard-enforced).

`generate.js`'s `validateSelection()` now checks every selected bundle's range against
the resolved target version **before generating anything** — same "refuse clearly, don't
generate something broken" principle as the existing `requires` validation. Verified
directly: `oauth-sso` on v21 correctly refused (exit 1, no directory created);
`primeng` on the assumed-latest default (v22) correctly refused the same way.

**Real, verified per-version behavior** (via actual pinned-version generation, not
research alone):

| | v19 | v20 | v21 | v22 |
|---|---|---|---|---|
| Zoneless by default | No | No | **Yes** (confirmed: no explicit provider in `ng new`'s own output — the framework's default scheduling itself changed, not just scaffolding) | Yes (assumed same as v21, not independently re-tested this session) |
| Test runner default | Karma | Karma | Vitest | Vitest (assumed) |
| `eslint.config.js` present by default | No | No | No | No (all consistent — none scaffold ESLint without our schematic step) |
| Root component file name | `app.component.ts` | `app.ts` | `app.ts` | `app.ts` (assumed) |
| `provideBrowserGlobalErrorListeners()` present | **No** | Yes | Yes | Yes (assumed) — a version-tier content gap in `error-handling.md` noted but not resolved this session, since it wasn't in scope of "get zoneless right" |

**Zoneless enablement built for v19/v20** (`enableZonelessForLegacyVersion()`), and this
needed to be *correct*, not just "compiles" — confirmed via research that a successful
build does NOT mean change detection is actually scheduled correctly without either
zone.js or the explicit provider call. Handles:
1. Strips `zone.js`/`zone.js/testing` from `angular.json` polyfills (build **and** test
   targets — both have it by default).
2. Removes `zone.js` from `package.json` dependencies.
3. Replaces the existing `provideZoneChangeDetection({ eventCoalescing: true })` call
   (present by default on both v19 and v20 — not just adds a new provider alongside it,
   which would be contradictory) with the version-correct zoneless provider —
   **`provideExperimentalZonelessChangeDetection()` on v19** (still experimental then)
   vs. **`provideZonelessChangeDetection()` on v20** (stabilized at 20.2) — verified via
   both official docs and real package behavior, not assumed to share one name.
   Implemented via literal string replacement, not regex-splicing into the providers
   array, after real testing showed the array is formatted differently across versions
   (v19: single-line; v20/v21: multi-line) — format-agnostic by construction rather than
   assuming line structure.

**Three more real, version-specific bugs found and fixed by actually generating and
building each version — not by researching alone:**

1. **A documented, filed `ng add` resolution bug** (`angular-eslint#2180`): unpinned
   `ng add @angular-eslint/schematics` can fail to resolve the version matching a
   non-latest target and grab the latest regardless. Fixed: `BASE_POST_GENERATE_COMMANDS`
   converted from a static array to a function of the target major version, pinning
   `@angular-eslint/schematics@${targetAngularMajor}` explicitly — safe because
   `@angular-eslint`'s major version is documented, stable policy to align 1:1 with
   Angular's own major version. Every `ng` invocation in this path now also runs through
   the *same* pinned `@angular/cli@${targetAngularMajor}`, not an unpinned `npx
   @angular/cli`, since a mismatched CLI runner could produce different schematic output
   than what actually scaffolded the project.
2. **A quote-style difference in `@angular-eslint`'s own generated `eslint.config.js`**:
   v20's schematic emits CommonJS/double-quote-style output (`require(...)`,
   `"@angular-eslint/directive-selector"`); v21/22 emit ESM/single-quote-style
   (`import`, `'@angular-eslint/directive-selector'`). This broke both
   `fixSelectorPrefix()` and `tightenEslintRules()`'s literal-string-anchor logic
   (built and tested only against v21/22's format in earlier sessions) — found via a
   real failing `git commit` on a v20 test, not by inspecting the fix in isolation.
   Fixed by rewriting both functions to use quote-agnostic regexes
   (`/prefix:\s*(['"])app\1/g` and a capturing-group-based anchor) instead of a literal
   string tied to one quote character. Re-verified clean on v19, v20, and v21 after the
   fix — including v19 tested with a **custom** `--selector-prefix=acme` to actually
   exercise the replacement logic, not just the untouched default.
3. **Root component file-naming difference**: v19 uses the pre-2024-style-guide
   convention (`app.component.ts`, class `AppComponent`); v20+ uses the current
   no-suffix convention (`app.ts`, class `App`). `fixSelectorPrefix()` only checked for
   `app.ts`, silently no-op'ing on v19 (no error, no warning — just didn't fix
   anything). Found via a real `eslint --fix` failure inside the Husky pre-commit hook
   on a v19 test with a custom prefix. Fixed by checking both candidate filenames.

**A fourth bug found, version-independent — not specific to legacy versions at all:**
**prettier was never an actual pinned dependency anywhere in this system.**
`CLAUDE.md` has claimed "Format: Prettier" as a locked constant since session 3, and
`format-and-lint.sh` plus the new Husky/lint-staged config (session 16) both call it —
but no bundle, no base file, ever added it to `package.json`. It had been silently
"working" only because `npx prettier` auto-installs on demand when missing — which
does *not* happen inside `lint-staged`'s spawn mechanism (`ENOENT`, a hard failure, not
a slow-but-working fallback). This means **the Husky pre-commit hook built and
"verified" in session 16 had never actually been tested with prettier genuinely
missing** — it happened to have prettier available by some earlier coincidental
install path in every prior test. Found on the very first real v19 test this session.
Fixed with a new `ensurePrettierInstalled()`, pinned to the verified current version
(`^3.9.5`), run for every generated project regardless of Angular version — this is a
Category-A universal fix, not a legacy-version-specific one.

**Explicitly deferred, at the user's direct request, not silently skipped:** how to
handle the Karma-vs-Vitest test-runner difference across versions. Real research
surfaced that Vitest has no official first-party migration path before v21 (the native
`@angular/build:unit-test` builder is v21+ only; pre-v21 would require a third-party
AnalogJS schematic, breaking this system's "prefer the real official schematic"
principle). `angular.md`'s "Test runner is Vitest" claim is therefore **known to be
inaccurate for v19/v20-targeted projects** until this is resolved — tracked here
explicitly so it isn't forgotten, not fixed this session.

**Sandbox limitation encountered, correctly identified as environment-only, not a
generator bug:** `ng test` on v19 failed with "No binary for ChromeHeadless browser" —
this sandbox has no Chrome installed, so Karma's actual test execution (not just
`ng build`) could not be verified end-to-end for v19/v20. Build and lint were verified
for both; live test execution was not, and should be checked on a real machine.

All 4 versions' JSON/syntax validated; test artifacts cleaned up after each run.

## 24. Skill now actually asks about Angular version (session 19)

User caught a real, meaningful gap after reading the version-gating work in §23:
everything built there — `minAngularMajor`/`maxAngularMajor` validation, per-version
zoneless enablement, ESLint version pinning — was real and tested, but only reachable
via a direct `generate.js` CLI call. The `new-angular-project` skill, which is what
anyone actually using this system day-to-day would go through, never asked about
version at all and silently always generated against latest. Built, but not reachable
— worth distinguishing those two states explicitly rather than calling it "done."

**Decided explicitly, asked rather than assumed:** add it as a real, always-asked
question (not a hidden/optional one). New **Step 2** in `SKILL.md` (skill now has 7
steps, not 6), placed **before** the 8 axis questions rather than after, deliberately —
the chosen version can invalidate specific axis answers (`oauth-sso` needs ≥22;
`ngrx-signalstore`/`primeng` need exactly 21), so asking version first avoids having to
walk back an axis answer the operator already gave. The question is directed at the
skill's operator directly (not run through Case 1/Case 2 client phrasing), consistent
with the clarified handoff sequence from session 15 — this is an infrastructure
decision, not something a client would meaningfully answer.

The new step also tells the skill to catch a version/axis conflict conversationally,
the same way it already catches `roles:rbac` + `auth:none` — rather than only relying
on `generate.js`'s own hard validation to be the first thing that notices.

Updated the confirmation summary and the example `generate.js` invocation to include
`--angular-version`. Re-verified: frontmatter still parses, every flag name still
matches `generate.js`'s real `AXES`/`args` exactly, and a real dry-run using the exact
flag pattern the updated skill would now produce (`--angular-version=21` +
`ngrx-signalstore` + `primeng` together) completed cleanly.

## 25. First real-machine bug confirmation: NG0908 zoneless test failure (session 20)

The user actually ran `TESTING-PLAN.md` via their own Claude Code session, on a real
machine with real Chrome — the first time anything in this project's testing has run
outside this sandbox's constraints. It immediately surfaced the exact gap §23 could
only flag as a risk: `npm test` on an Angular 19/20 zoneless-enabled generated project
threw `NG0908` ("this configuration requires Zone.js").

**Root cause, diagnosed correctly by the user's own Claude Code session before this
one even saw it**: `enableZonelessForLegacyVersion()` (session 18) adds the zoneless
provider to `app.config.ts` — but the CLI-generated root component spec file
(`app.spec.ts`/`app.component.spec.ts`) bootstraps its **own**, separate `TestBed`
module via `TestBed.configureTestingModule({ imports: [...] })`, which does not
inherit anything from `app.config.ts`. The test injector fell back to expecting
zone.js, didn't find it (since it had been correctly stripped), and threw.

**Decision point handled correctly by the user**: presented with "patch the one
generated project" vs. "fix the generator," chose the generator fix — consistent with
every prior instance of this same choice throughout this project (the `.env`
protection gap, the environments/ bug, the prettier gap, all fixed at the source, not
patched per-project).

**Fix**: extended `enableZonelessForLegacyVersion()` with a 4th step — locates the spec
file (checking both v19's `app.component.spec.ts` and v20+'s `app.spec.ts`, same
dual-candidate pattern as the root-component fix), adds the correct version-specific
zoneless provider to its `TestBed.configureTestingModule`'s `providers` array via a
regex-captured, indentation-preserving replacement (not a naive string anchor, given
the quote/format lessons from session 18), and adds the corresponding import.

**Verified**: real regeneration for both v19 and v20, `ng lint` clean on both, `ng
build` clean on v20 (v19 build already confirmed clean in session 18, unaffected by
this change). **Genuinely honest limitation, not glossed over**: this sandbox still has
no Chrome binary, so the actual `npm test`/Karma run — the only thing that can
*truly* confirm `NG0908` itself is resolved — could not be re-executed here. The fix
follows Angular's own documented, standard pattern for injecting TestBed providers, so
it should resolve the error, but **the user's own re-run on their real machine is what
actually closes this loop**, not this session's build/lint checks alone.

This is also the first real evidence that `TESTING-PLAN.md` (session, unnumbered —
created between sessions 19 and 20) works as intended: a real-machine test battery run
by the user's own Claude Code session found a genuine bug this sandbox structurally
could not have found itself, and it got fixed at the source within one turnaround.

## 26. First full real-machine test run — `TESTING-PLAN.md` executed end-to-end (session 21)

User ran the entire test plan for real, via their own Claude Code session, and reported
back a precise, honest result table — correctly distinguishing generator logic failures
from environment constraints throughout, not conflating the two.

**The single most important confirmation in this project's history**: **Test 5 (Angular
19) passed completely** — `ng lint` clean, `ng build` clean, `ng test` genuinely
launched real Chrome + Karma and passed 3/3 with **zero `NG0908` errors**. The
session-20 fix (`enableZonelessForLegacyVersion()` patching the CLI-generated spec
file's `TestBed` providers) is now proven correct on real hardware, not just "should
work by pattern." This is the first fix in this project's entire history to go from
"verified via sandbox build/lint only" to "verified via a real, passing test run."

**All 4 negative tests (8–11) passed exactly as designed** — refused with exit 1, no
directory created, and the exact expected error message naming the real conflict, for
both `requires` violations and both directions of version-gating (`oauth-sso` floor,
`primeng`/`ngrx-signalstore` ceiling on two different bundles). The validation
infrastructure built in session 18 is now confirmed correct end-to-end, not just in
this sandbox.

**A new, real environment constraint found — correctly identified as environmental,
not a generator bug:** the test machine's Node is `v20.13.1`. Angular's own CLI
minimum has apparently moved since earlier research — CLI 20 and 21 now require
`>=20.19`, not just "whatever's compatible" — meaning `v20.13.1` is too old for
**everything except v19**. This blocked Tests 1, 2, 3, 7 (all targeting true latest,
v22) and Tests 4 and 6 (v21 and v20) at `ng new` itself, before `generate.js`'s own
logic ever ran. Confirmed in every blocked case that `generate.js`'s own validation
resolved and passed correctly regardless (e.g. Test 4's report explicitly notes
"validation passed, but Angular CLI 21 requires Node ≥20.19/22.12") — the failures are
squarely `ng new`/Node-version issues, not bugs in this system's own logic.

**Still genuinely open, now doubly-confirmed rather than newly found:**

1. **True Angular 22 has now failed to be verified on two separate machines** — this
   sandbox (Node one patch version short of the true minimum) and the user's real
   machine (Node considerably further short). This remains, unchanged, the single
   biggest untested gap in this entire project — **recommend the user upgrade Node to
   at least v22.22.3 (or v24.15+/v26+) specifically to unblock this**, since it's the
   one thing neither testing environment so far has been able to reach.
2. **v20's `NG0908` fix specifically remains unconfirmed by real Karma.** Test 5 (v19)
   and Test 6 (v20) both exist in the plan specifically because the two versions'
   fix code paths differ (different `eslint.config.js` quote-style handling, different
   root-component filename) — confirming one does not prove the other. Test 6 never
   got past `ng new` here, so this is still open, not resolved by Test 5's success.
3. **The skill tests (4a/4b) proved logic consistency, not live runtime behavior** —
   reported with appropriate honesty by the user's own sub-agent rather than
   overclaimed: the test simulated both sides of the conversation in one pass instead
   of a genuine turn-by-turn session. This confirms the skill's *written instructions*
   are internally consistent (correct question order, correct flag omission for
   "latest," correct conflict detection logic) but does **not** prove that a live
   Claude Code session actually pauses and waits after each question rather than
   batching them — that would need an actual human (or a genuinely separate,
   non-simulated multi-turn session) working through the skill conversationally, not a
   sub-agent narrating both sides.

**Every test output directory was deleted immediately after recording results, per the
updated plan** — confirmed by the user's own report, nothing left in `/tmp`.

## 27. Official `angular/skills` review — 6 real gaps closed, 1 real regression found and fixed (session 22)

User asked whether we'd reviewed the Angular team's own official agent-skills repo
(`github.com/angular/skills`) and, if not, to look deeply and integrate anything
missing — explicitly prioritized since "it's from the official angular doc git for
[anyone] choosing Angular as their stack." Fetched the repo's actual `SKILL.md` and its
`references/` index directly (not from memory), then verified every specific technical
claim against angular.dev/the npm registry before writing anything, same discipline as
every other session.

**6 real gaps found and closed, each independently verified:**

1. **`linkedSignal()`** — stable since Angular 20 (confirmed via angular.dev), never
   mentioned anywhere in this system despite being a real, current, officially
   documented signal primitive for writable-derived-state. Added to `angular.md`'s
   State section with its actual use case (a selection that defaults from a source
   list but can be manually overridden).
2. **`resource()`/`httpResource()`/`rxResource()`** — Angular's signal-based async data
   primitives. **Deliberately flagged as still experimental**, not presented as
   equally solid as `linkedSignal()` — confirmed via angular.dev that these remain
   experimental as of this writing, unlike `linkedSignal`. Added as "recognize this,
   don't reinvent it ad hoc" guidance, not a replacement for this project's already-
   stable `data-layer` bundle patterns.
3. **Signal Forms as the actual v21+ default, not an opt-in exception.** This was the
   most consequential fix. Our own `angular.md` previously said Signal Forms would only
   be used "if a specific feature calls for it" — but the official skill states
   plainly: *"Signal Forms are the recommended approach for handling forms in modern
   Angular applications (v21+)"* and *"CRITICAL: you MUST use Angular's new Signal
   Forms API for all form-related functionality"* for those versions. Verified the
   stability timeline precisely (experimental at v21 — angular.dev's own API docs mark
   `schema()` "experimental since v21.0" — stable at v22) and the actual API surface
   directly from the official skill's own `references/signal-forms.md` (`form()`,
   `FormField`, `submit()`, built-in validators `required`/`minLength`/`maxLength`/
   `min`/`max`/`pattern`/`email`, the `[formField]` directive) — the single most
   authoritative source available, not a second-hand blog post. Implemented as a real
   version-conditional content block (a new `{{FORMS_GUIDANCE}}` placeholder,
   computed per-generation from the target Angular version), not just a word swap —
   v19/v20 keep the existing Reactive Forms guidance verbatim (Signal Forms doesn't
   exist before v21), v21 gets the new guidance with an explicit "still experimental"
   caveat, v22 gets it marked stable.
4. **Data Resolvers (`ResolveFn`)** — pre-fetching route data before activation,
   sitting right alongside guards (which this project already covered) but never
   mentioned itself. Added to `architecture.md` with guidance on when it's the right
   choice vs. progressive loading.
5. **Component Harnesses (`@angular/cdk/testing`)** — Angular's official pattern for
   testing component interactions without depending on internal DOM structure,
   especially relevant when `styling: material` is selected. Added to `angular.md`'s
   Testing section.
6. **Angular Aria's specific component list** — previously a vague "check before
   hand-rolling" mention in `accessibility.md`. Replaced with the actual official list
   (verified against the skill's own reference index): Accordion, Listbox, Combobox,
   Menu, Tabs, Toolbar, Tree, Grid.

**Deliberately NOT built into a new axis, flagged instead:** E2E testing. Checked
Angular's own CLI docs directly — `ng e2e` offers five different schematics (Cypress,
Playwright, WebdriverIO, Nightwatch, Puppeteer) with no single official default, unlike
unit testing's clear Vitest/Karma split. Added a brief, honest mention in `angular.md`
("this project's unit tests don't cover e2e; if needed, flag it for a developer to set
up deliberately") rather than either inventing a default Angular itself doesn't have,
or over-scoping into a full new bundle axis without confirming that's wanted first —
same restraint applied when e2e first came up mid-research.

**A real, separate regression found and fixed while implementing the Signal Forms
placeholder — this is arguably the most important finding of the session, independent
of the angular/skills content itself:** testing the new version-conditional Forms
guidance surfaced a genuine bug in last session's ESLint version-pinning fix. When
`--angular-version` is omitted, `generate.js` uses an `ASSUMED_LATEST_ANGULAR_MAJOR`
constant (22) for validation and version-dependent decisions — but the *actual*
`ng new` resolution can differ from that assumption in this sandbox (it has
consistently resolved v21, not v22, for the Node-version reasons documented since
session 9). Previously this silently "worked" because the ESLint schematic call was
unpinned; pinning it explicitly (session 18, to fix a different, real `ng add`
resolution bug) introduced a new failure mode — pinning to a version that didn't match
what was actually scaffolded. **Fixed properly, not patched around**: after
`scaffoldAngularWorkspace()` runs, `generate.js` now reads the *actual*
`@angular/core` version from the freshly-generated `package.json`, and if it differs
from the pre-generation target, recomputes every downstream decision (ESLint pinning,
zoneless enablement, Forms guidance, test runner) from the real value — with a clear,
visible warning printed explaining the discrepancy, not a silent substitution. Required
converting `formsGuidance`'s construction from a pre-built string (which had the
version number baked in at construction time, so re-selecting between two stale
strings after a correction wouldn't have actually fixed the wording) into a proper
function computed fresh on demand — caught by inspecting the code again after the
first fix attempt, not assumed correct on the first pass.

**Verified end-to-end, real (non-dry-run) generation, more thoroughly than a typical
single-bundle test given how many independent pieces changed at once:** confirmed
Forms guidance branches correctly across v19 (Reactive Forms, honest "doesn't exist
yet" framing), v21 (Signal Forms, marked experimental), and true latest (Signal Forms,
marked stable) — three separate real generations, not just reading the code and
assuming. Confirmed the version-correction warning fires and every downstream value
updates correctly when the sandbox's actual resolution (v21) diverges from the
assumed target (22) — including the ESLint schematic pinning to the *correct* version
this time, `ng lint` and `ng build` both passing on the corrected output. All other
new content (`linkedSignal`, data resolvers, component harnesses, Angular Aria list)
confirmed present in real generated output via direct inspection, not assumed from the
source files alone.

Full JSON validation and `generate.js` syntax check re-run clean after all changes.

## 28. Real-machine friction found on first live skill run (session 23, previously undocumented)

A team member (Giresh) ran `run-feature-test` for real for the first time. Two real,
non-generator-logic issues surfaced:

1. **`git status` hung for 2 minutes, then 30 seconds again** — the clone lived at
   `~/Desktop/new folder/boilerplate-generator`. `~/Desktop` is commonly synced by
   iCloud Drive on Mac, a confirmed real cause of exactly this symptom (filesystem
   operations blocking on background sync/eviction). Not a bug in `generate.js` or the
   skill — an environment issue. Fixed by adding an explicit warning to
   `FEATURE-TEST-PLAN.md`'s Step 0, before anyone clones, to use a non-cloud-synced
   location (`~/dev`, `~/projects`, etc.).
2. **Claude Code's own built-in security prompt** ("Compound command contains `cd`
   with output redirection — manual approval required") interrupted the
   zero-questions design. This was self-inflicted: Claude's own defensive workaround
   while fighting the hang above (redirecting output to a log file, chained with `cd`
   in one command) triggered a real Claude Code product-level safety check — not
   something in the skill's own instructions. Also attempted (and failed) to use
   `timeout`, which doesn't exist on macOS by default. Fixed by adding explicit
   guidance in the skill to avoid the `cd && >` pattern entirely and not rely on
   `timeout` — if a command seems to hang, suspect a cloud-synced folder and say so in
   the report rather than fighting it with workarounds.

Both fixes verified for internal consistency (frontmatter, no other instances of the
same pattern) before pushing.

## 29. Real client requirements cross-checked against the generator, 5 gaps closed (session 24)

User shared a real company decision-tree document plus a real client's (Maxim's)
actual answers to it, and asked whether the generator genuinely supports what was
requested — not hypothetically, for an actual project needing to start. Went through
all 11 answers point by point rather than assuming coverage.

**5 real gaps found:**
1. Tailwind "gated through design tokens (semantic utilities, not raw classes)" —
   the existing `check-hardcoded-colors.sh` hook only catches literal hex/rgb/hsl
   values, not raw Tailwind palette utility classes (`bg-blue-500` vs `bg-primary`).
2. Playwright e2e testing — client had already decided on it; this system had zero
   actual scaffolding for any e2e tool (only a passing mention that Playwright is one
   of five options Angular's own CLI supports).
3. Auth0 and AWS Cognito specifically — client's real options; this system only had a
   generic OIDC (`oauth-sso`) auth bundle, not either provider's actual idiomatic SDK.
4. Superset-embedded charts + gridstack layout — entirely outside scope, correctly
   flagged as too client-specific to build a generator axis for, not attempted.
5. AWS S3 + GitLab CI OIDC deployment — entirely outside scope, same treatment as #4.

**Also surfaced a structural pattern**: 3 of Maxim's answers (state, i18n, auth) were
"not needed yet, but explicitly planned" — a genuinely different answer than a flat
"no," needing different guidance ("structure this so adding it later is easy," not
"don't add this"). Confirmed with the user this should be handled specific to this
project, not as a general reusable system feature — implemented as project-specific
`CLAUDE.md` additions on Maxim's own generated repo, not changes to the shared bundle
rule files.

**Given explicit approval for full scope, built and verified the priority gaps (1–3),
each with the same real-generation + real-build discipline as every other bundle in
this project:**

- **`auth: auth0`** — real `@auth0/auth0-angular` SDK (verified: no upper version
  bound, `>=13` peer dependency). Isolated, protected `auth0.config.ts` (matching the
  existing `oauth.config.ts` pattern); a thin project-owned `AuthService` wrapper
  around Auth0's own service, using the current functional APIs (`authGuardFn`,
  `authHttpInterceptorFn`) — not the deprecated class-based ones. Verified via real
  generation, `ng lint`, and a real `ng build` with `provideAuth0(...)` manually wired
  into `app.config.ts` (the same "manual wiring required" pattern as PrimeNG, since
  there's no CLI schematic for this).
- **`auth: cognito`** — `aws-amplify` v6's functional Auth API (`signIn`, `signOut`,
  `getCurrentUser`, `fetchAuthSession` from `aws-amplify/auth`), explicitly scoped to
  an *existing* Cognito user pool (not the Amplify CLI/backend-provisioning workflow,
  which assumes Amplify owns the resources — confirmed this distinction matters via
  research, not assumed). Same isolated-config + thin-wrapper pattern as Auth0.
  Verified via real generation, lint, and build with `configureCognito()` manually
  wired into `main.ts`.
- **New `e2e` axis** (`none`/`playwright`) — `@playwright/test` installed statically
  (deps + a protected `playwright.config.ts` + a starter test) rather than via the
  interactive `npm init playwright@latest` initializer, avoiding exactly the kind of
  hang seen in session 23. Verified via real generation and lint/build; actual test
  execution blocked by this sandbox's network restrictions on the Chrome-for-Testing
  download (same class of limitation as the Google Fonts case in session 17 — a
  sandbox constraint, not a generator bug).
- **`check-raw-tailwind-utility.sh`** — new universal hook (harmless on non-Tailwind
  projects, since the class names it checks for can't appear there), tested with 4
  real cases (raw color utility blocked, semantic class allowed, non-color utility
  allowed, gradient utility also correctly blocked). Added to `base/` since it directly
  addresses a real, confirmed client requirement.
- **Skill updated** (`new-angular-project`): Q1 (auth) now offers `auth0`/`cognito`
  alongside the existing options, with explicit guidance not to force a choice when a
  client hasn't decided between providers yet (matches Maxim's actual "still open"
  answer) — default to `none` and note the open decision in `--description` rather
  than generating something that has to be undone later. New Q9 for e2e testing.
  Question count, confirmation summary, and the invocation example all updated and
  re-verified for consistency (frontmatter, flag names matching `generate.js`'s real
  `AXES` exactly).

**Generated Maxim's actual project** (`--angular-version=21`, the real combination of
answers, defaulting `data-layer`/`roles` — genuinely absent from the client's own
decision-tree scope — to `rest`/`single-role` and stating that assumption explicitly
rather than silently picking). Verified real `ng lint` and `ng build` both clean.
Added the "planned for phase 2" guidance (SignalStore/i18n/auth migration readiness),
the `@quik/ui`-vs-bare-Tailwind clarification, and the explicitly-out-of-scope items
(Superset/gridstack, AWS/GitLab deployment) as a new section appended directly to
*that project's own* `CLAUDE.md` — deliberately not touched in the shared generator's
rule files, per the user's explicit "specific to this project" scoping decision.

**Follow-up, same session**: initially bundled the charts/deployment "leave as a
documented note, don't build generator infrastructure" call into the general
full-scope go-ahead without getting explicit confirmation on that specific split —
caught and named this gap directly rather than letting it stand as an unconfirmed
assumption. Asked separately; **user confirmed both explicitly**: deployment stays a
documented note ("too infra-specific for this generator"), charts stays a documented
note ("correctly too niche/proprietary"). No generator changes needed — the existing
`CLAUDE.md` additions on Maxim's project already matched this exactly.

Full JSON validation and `generate.js` syntax check re-run clean after all changes.

## 30. Two real test reports reviewed — the most severe bug in this project's history found and fixed (session 25)

Reviewed `test-reports/tester-1-*.md` and `test-reports/tester-3-*.md`, the first two
reports from the parallel testing exercise. Both were exceptional — full pasted code
(not summaries), careful, honest self-checks, and both explicitly distinguished "I
made a judgment call, here's why" from "this looks like a real generator gap, flagging
for the central-brain session" exactly as `FEATURE-TEST-PLAN.md`/the skill asked.

**The critical bug, found by tester 3**: `app.config.ts` ships with **no
`provideHttpClient()` at all** — not from `base/`, not from any bundle's
`postGenerateCommands`. But `basic-auth` generates `authInterceptor`, `rest` generates
`errorInterceptor` and an `ApiService` that injects `HttpClient`, `saml`'s
`AuthService` calls `HttpClient` directly, `graphql`'s Apollo `HttpLink` needs it too
— every one of these would throw a real `NullInjectorError` the instant the app
actually ran in a browser. **This was completely invisible to every check this
project has ever run** — `ng lint` doesn't execute the app, `ng build` only compiles
it, and every unit test supplies its own `provideHttpClient()`/`provideHttpClientTesting()`
in `TestBed`, which masks the real app's `app.config.ts` being broken. Tester 3 only
found it because they manually wired a *different* bundle (PrimeNG, whose "manual
wiring required" note is correct and unrelated) and, while looking closely at
`app.config.ts` to do that, noticed `HttpClient` was silently missing too.

**Verified this was real, not tester error**, before touching anything: generated a
fresh project independently and confirmed the actual `app.config.ts` content matched
exactly what tester 3 described.

**Fixed using manifest fields that already existed** (`needsHttpClient`,
`httpInterceptors` on `basic-auth`/`rest`/`saml`/`graphql`) — found sitting in the
working copy, fully designed and even already documented in `BUNDLE-CONTRACT.md`, but
**uncommitted with no traceable git history**, and — critically — never actually read
by anything in `generate.js`. The data model was already correct; the function that
was supposed to consume it simply didn't exist yet. Wrote `wireHttpClientAndInterceptors()`:
collects `needsHttpClient`/`httpInterceptors` across every selected bundle, and if any
bundle needs it, prepends `provideHttpClient()` (or
`provideHttpClient(withInterceptors([...]))` if any bundle contributed one) into
`app.config.ts` — real, automatic wiring, not a manual-step note, since (unlike
PrimeNG's theme choice or Auth0's domain/clientId) there's no actual per-project
decision involved here.

**Extended to the new `auth0` bundle** (built session 24) — added
`needsHttpClient`/`httpInterceptors` for `authHttpInterceptorFn`, matching what its own
rules file already recommended. Updated `auth0`'s, `basic-auth`'s, and `rest`'s rule
files to state clearly that this wiring is now automatic — `auth0`'s previously said
to register the interceptor manually, which would now be stale/duplicate advice.

**Verified across 4 real scenarios**, each a full real generation:
1. `basic-auth` + `rest` together → both interceptors correctly joined into one
   `withInterceptors([authInterceptor, errorInterceptor])` call.
2. `auth0` alone → `authHttpInterceptorFn` correctly wired from a completely different
   bundle's declaration, proving the cross-axis collection actually works generally,
   not just for the one combination that exposed the bug.
3. `saml` alone (`needsHttpClient: true`, no interceptor) → plain `provideHttpClient()`,
   no `withInterceptors` wrapper.
4. `auth: none` + `data-layer: mock` (neither needs it) → correctly skipped entirely,
   `app.config.ts` untouched.

All 4 confirmed via real `ng lint` and `ng build`, not just inspecting the generated
`app.config.ts` in isolation.

**A second, independently-corroborated finding**: both testers, working on completely
different bundle combinations, separately hit the identical ambiguity — whether
Signal Forms' `[formRoot]` directive should be used together with an explicit
`submit()` call, or instead of one. Both independently chose the same conservative
resolution (explicit `(submit)` handler + `event.preventDefault()` + `submit(...)`,
skip `[formRoot]` entirely) and both said so worked cleanly. Two independent testers
converging on the same answer to the same open question, on different bundle
combinations, is a strong signal — resolved definitively in `generate.js`'s
`computeFormsGuidance()` with a concrete, verified-working code example (both the
`.ts` and `.html` shape), not just narrative guidance.

**4 smaller confirmed gaps, each fixed**:
- `accessibility.md`: a `placeholder` attribute alone is not a sufficient accessible
  name for an `<input>` — found by independently reviewing tester 1's actual template
  code (a search input with only a `placeholder`, no label/`aria-label`), not
  something either tester flagged themselves.
- `architecture.md`: the "where new code goes" table had no row for a per-feature
  SignalStore's location — tester 3 found `state.md`'s own guidance unambiguous enough
  to not cause a wrong decision, but flagged the omission; added the row.
- `bundles/state/ngrx-signalstore/rules/state.md`: this project's pinned
  `@ngrx/signals` version doesn't ship an `rxjs-interop` subpath (`rxMethod()`
  unavailable) — tester 3 checked `node_modules` directly rather than assuming, found
  a plain `.subscribe()` call inside `withMethods` is a valid fallback; documented.
- `angular.md`: a component-scoped provider (not `providedIn: 'root'`) needs the same
  provider declared again in `TestBed.configureTestingModule` — expected Angular DI
  behavior, not a bug, but tester 1 had to work it out via trial and error; documented
  so the next tester doesn't have to.

Full JSON validation and `generate.js` syntax check re-run clean after all changes —
including one real syntax risk specifically checked given the new Signal Forms code
example is a JS template literal containing nested backtick-delimited code blocks.

## 31. Second SSR bug fixed, and the most significant methodological finding of the whole testing exercise (session 26)

Reviewed 2 more reports: tester 2 (a correct, expected failure — `oauth-sso` needs
Angular ≥22, unreachable on their Node) and tester 4 (a full pass on a genuinely
complex combination — SSR + PWA + Tailwind + multi-language, with real Signal Forms,
Transloco, and semantic Tailwind tokens all used correctly).

**Second real, confirmed bug, found by tester 4**: a production build with
`basic-auth` + `deploy-target: ssr` logs `ReferenceError: localStorage is not defined`
during prerendering (non-fatal — build still exits 0 — but pollutes real build logs
and is a real correctness issue). Root cause: `AuthService.readStoredToken()` calls
`localStorage.getItem(...)` inside a field initializer
(`signal<string | null>(this.readStoredToken())`), which runs the moment the service
is constructed — and since `AuthService` is `providedIn: 'root'`, Angular's root
injector graph constructs it eagerly, including during Node-based SSR prerendering,
where `localStorage` doesn't exist. Tester 4 correctly did not touch this
protected file themselves, flagging it precisely for the central-brain session
instead. **Fixed with the standard `isPlatformBrowser()` guard** (inject
`PLATFORM_ID`, check once, gate all three `localStorage` call sites) — reproduced the
exact failing combination first, confirmed the original error, then confirmed the fix
produces a clean `"Prerendered 1 static route"` with no error, via a real generation
and a real `ng build`, not just a code review.

**The most significant finding, by a wide margin, across the entire parallel-testing
exercise so far**: tester 4 discovered that no hook ever actually fired during their
session, and — rather than concluding the code was simply compliant — investigated
*why*, and found the real cause: Claude Code only loads `.claude/settings.json` (and
therefore all hooks) from a session's **startup working directory**. The
`run-feature-test` skill's entire flow (Phase A generation, then feature-building,
previously all in one continuous session) runs from inside the `boilerplate-generator`
clone — which was confirmed, by direct inspection, to have **no `.claude/settings.json`
of its own**, only `.claude/skills/`. This means every file written into a generated
project at `/tmp/feature-test-<N>/...` during the old single-session flow was written
by a session whose active hook configuration was *nothing* — not the generated
project's real hooks.

**Independently verified this is a real, confirmed, filed Claude Code platform
limitation**, not a guess or a local misconfiguration — via direct web research:
GitHub issue #52934 ("`[FEATURE] Load .claude/settings*.json and hooks from
directories added via --add-dir / additionalDirectories`") states plainly: *"Claude
Code currently loads `.claude/settings.json` ... only from the session's startup
working directory."* A related filed bug (#10367) confirms hooks can be entirely
non-functional across subdirectories more generally. The only reliable workaround the
Claude Code community itself has converged on for this class of problem is
**restarting Claude Code from the target directory** — there is no way to fix this
from the generator's side or the skill's own instructions alone.

**Consequence, stated plainly**: every prior test report's "Hook behavior observed:
none fired" was *not* evidence that the generated code was correctly compliant
*because of* the hooks — it was evidence the hooks were never active in the first
place. The actual code compliance seen across all 4 prior reports reflects each
tester's own careful reading of the rule files (a real, separate, valuable signal
about whether the *written guidance* is good enough to guide correct behavior on its
own) — but it says nothing about whether the *hook enforcement layer* itself works in
real agentic use. That remains genuinely untested as of this session.

**Fixed by restructuring `run-feature-test` into an explicit 2-phase, 2-session
flow** — the trade-off judged clearly worth it, since hook enforcement is this
system's core value proposition, and a "fully autonomous" test that structurally
cannot exercise it is worth much less than a mostly-autonomous one that requires
exactly one necessary human action:
- **Phase A** (unchanged, still in the `boilerplate-generator` clone): get the tester
  number, look up the assignment, generate. Ends by printing explicit handoff
  instructions and genuinely stopping — does not attempt to build the feature itself.
- **Phase B** (new): the human opens a **new terminal**, `cd`s into the generated
  project, starts a fresh `claude` session there (correctly scoped, so its real
  `.claude/settings.json` hooks are active), and pastes a literal, fully-specified
  feature-building prompt (same content as before, inlined directly in the skill so
  Phase A can reproduce it verbatim for the human to paste) — including an explicit,
  structured summary format that session must output at the end (files touched, full
  code, hook behavior *actually* observed this time, verification results,
  assumptions) so it can be pasted back cleanly.
- **Phase C** (new): back in the original session, the human pastes Phase B's summary,
  and the original session writes the report from that content, then pushes and
  cleans up — unchanged from before otherwise.

Also folded in, while restructuring: `--e2e` was missing from the skill's own inlined
assignment table (`generate.js` now requires 9 axes, the table only listed 8) — tester
4 found this via a real, immediate command failure and correctly defaulted to
`--e2e=none` with a documented reason. Fixed the table directly. Also added an
explicit note for assignment 2 specifically (tester 2's finding) that `oauth-sso`'s
Angular ≥22 floor makes it categorically unrunnable below Node ≥22.22.3, regardless of
version-fallback attempts, so a future tester doesn't waste time trying v21/v20/v19
fallbacks that would fail identically.

**One more smaller, real gap fixed**: `mockResponse()`'s simulated network delay is
scheduled via a raw `setTimeout`, which zoneless change detection's `whenStable()`
does not track (only `PendingTasks`-integrated async work) — a real, easy-to-hit
testing trap tester 4 hit and had to work around. Documented in the `mock`
data-layer bundle's rules.

Full JSON validation, `generate.js` syntax check, and the restructured skill's
frontmatter all re-verified clean after all changes.

## 32. Final 2 reports reviewed — all 6 testers now in, 2 more critical bugs found and fixed (session 27)

**All 6 assigned parallel testers have now reported in.** Reviewed testers 5 and 6 —
both, like all prior reports, exceptionally thorough, with full pasted code and
honest self-assessment.

**Third critical bug, found by tester 5**: `roles/rbac`'s `has-role.directive.ts`
ships `selector: '[hasRole]'` — no prefix at all. `@angular-eslint`'s
`directive-selector` rule requires every custom directive's selector to start with
the project's configured prefix, so this fails `ng lint` on **every single `rbac`
project**, out of the box, regardless of `--selector-prefix` value (`[hasRole]` has
no prefix even against Angular's own default `'app'`). Worse: because the
generator's own bootstrap commit runs `eslint --fix` via the Husky pre-commit hook,
this also broke the generator's own initial commit for every `rbac` project — tester
5's own generation left an uncommitted working tree. **Fixed properly**: this
directive uses Angular's structural-directive microsyntax, where `*directiveName`
requires an input literally named `directiveName` — so the fix (new
`fixRoleDirectiveSelector()`) renames the selector *and* the input property *and*
every internal reference *and* `roles.md`'s own documented usage example, all
consistently, not just the selector string (which is all the equivalent root-component
fix needed — a real, structurally different case). Verified by regenerating tester
5's exact combination: previously-failing bootstrap commit now succeeds, `ng
lint`/`ng build` both clean, and the renamed selector/input confirmed consistent
across the directive file and `roles.md`.

**Fourth critical bug, found by tester 6**: `lint-staged`'s own transitive dependency
(`listr2`) calls `styleText` from `node:util`, an export only added in Node 20.19 — on
older Node this is a **hard `SyntaxError`**, not a soft engine warning, failing the
generator's bootstrap commit entirely. This is the same `lint-staged`/`listr2`
friction testers 1 and 4 had already flagged as a cosmetic `EBADENGINE` warning on
Node 20.19/20.20 — tester 6's older Node (20.11.1) is exactly where it escalates from
warning to hard failure. **Fixed** by adding `--no-verify` to the generator's own
bootstrap commit specifically — reasoned explicitly in the fix's own comment why this
doesn't weaken anything real: every file was already run through `format-and-lint`
during generation itself, so re-verifying via the pre-commit hook adds nothing on
*this* commit; every future commit made by a developer or agent in the generated
project remains fully subject to the hook, since `--no-verify` only applies to this
one explicit `git commit` call, not a permanent bypass. Verified the normal
(Node-sufficient) case still commits correctly and lints clean after the change —
could not directly reproduce the Node <20.19 failure itself in this sandbox (whose
Node is 22.x), so this fix's *mechanism* is verified working, but the specific
failure it targets could not be directly re-reproduced-then-fixed the way the other
three bugs this testing round were.

**Two more documentation gaps, each independently found by more than one tester**:
- **The zoneless `TestBed` provider requirement was completely undocumented** in
  `angular.md`'s Testing section — testers 5 *and* 6 both hit real `NG0908` test
  failures before discovering (from the generated `app.component.spec.ts`/`app.spec.ts`
  itself) that every `TestBed.configureTestingModule` needs the same zoneless provider
  `app.config.ts` uses. Documented directly, pointing to the generated app-level spec
  as the reference pattern rather than hardcoding a specific provider name (which
  differs between v19 and v20+).
- **`styling: none` had no concrete example** for where to define color tokens on a
  fresh project with no prior example to follow — tester 5 used literal hex values
  for exactly this reason. Added a concrete `:root { --color-...: ...; }` example
  directly in the bundle's rules file.

**Explicit answer to whether every report was actually reviewed, since this was asked
directly**: yes, now — all 6, in full, each cross-referenced against the real rule
files and (where a generator bug was suspected) independently reproduced and verified
fixed via real regeneration, not accepted on the tester's word alone. Testers 5 and 6
specifically were reviewed in this session, after initially being rebased/pushed
without being read — caught and corrected when asked directly, rather than assumed
already done.

Full JSON validation and `generate.js` syntax check re-run clean after all changes.

## 33. Tilde-expansion footgun found and fixed during final lead-review testing (session 28)

While regenerating Maxim's project for the final round of testing before lead review,
the user hit a real, reproducible bug: `--out-dir=~/maxim-final` did not resolve to
their home directory. Their terminal output showed the project land at
`.../boilerplate-generator/~/maxim-final/maxim-final` — a literal folder named `~`
created **inside** the generator repo clone itself.

**Root cause, confirmed via direct reproduction, not assumed**: two independent gaps
stacked. First, shell tilde expansion (`~` → home directory) is a shell-level
behavior, and it typically only applies when `~` is the very first character of a
whitespace-separated token — inside `--out-dir=~/maxim-final`, the actual token
starts with `--out-dir=`, so many shells (confirmed here: zsh) never expand the
tilde at all in this exact position. Second, even if the shell had passed a literal
`~` through, `generate.js`'s own `path.resolve(args['out-dir'] || process.cwd())`
has zero awareness of tilde expansion — `path` is a pure string-manipulation module,
not a shell — so it silently treated `~` as an ordinary folder name relative to the
current working directory.

**Fixed defensively in `generate.js`** rather than just telling the user to change
their invocation style: if `--out-dir` starts with `~/`, `~\`, or is exactly `~`,
manually expand it to `os.homedir()` before resolving. Verified by reproducing the
exact scenario (`--out-dir=~/tilde-test-check`) and confirming the project now lands
at the actual home directory, with no stray literal `~` folder left anywhere.

Everything else in the user's terminal output was working correctly, worth noting
explicitly: bundle validation, all 9 axes applying cleanly, the `provideHttpClient`
wiring fix from session 25 firing correctly (`errorInterceptor` wired automatically),
selector-prefix fixing, environment population, ESLint tightening, Husky/lint-staged
setup, and the initial commit all succeeded exactly as designed — the *only* failure
was the output path itself.

## 34. First genuinely hook-active test run — a systemic hook-visibility bug found (session 29)

The user opened a fresh Claude Code session correctly scoped inside `maxim-final`
itself and built the Products feature for real — the first time in this entire
testing exercise that hooks were actually live during a feature-build (every prior
report, across 6 testers, ran from a session with no active `.claude/settings.json`
at all, per session 26's finding). The resulting report found 4 more real issues.

**Most significant**: the agent noted it *expected* `check-missing-spec.sh` to warn
on 5 new files written without a matching spec yet, but never saw the warning
surface — and explicitly flagged this as worth investigating rather than assuming
the hook silently didn't fire. Investigated via Claude Code's own documentation and
multiple filed GitHub issues (confirmed, not just theorized): **a `PostToolUse`
hook's stdout/stderr is silently discarded when it exits 0** — that output only
reaches an internal debug log, never the visible transcript. Both `check-missing-spec.sh`
and `check-tsc.sh` were built as "warn but don't block" hooks using exactly the
pattern that triggers this — print a warning to stderr, then `exit 0` unconditionally.
**This means neither hook's warning has ever been visible to anyone, since the day
either was built** — not a recent regression, a design flaw present from the start,
only surfaced now because this was the first time a hook-active session with a
matching trigger condition actually occurred. Fixed both: exit 1 (non-zero, non-2 —
confirmed via the same documentation to be genuinely non-blocking *and* visible)
specifically when there's something to report, `exit 0` only for the true
"nothing to warn about" case. Verified with real, isolated test cases for each
(missing spec / spec present; real type error / no type error) — the second
`check-tsc.sh` test initially seemed to fail (exit 1 when a clean file was expected
to pass) until realized this was a test-setup mistake, not a hook bug: `tsc --noEmit`
checks the whole project, and a previous test's deliberately-broken file was still
present in the same directory — corrected the test, confirmed the hook logic was
right all along.

**Two real, confirmed gaps in `check-hardcoded-colors.sh`**, both found by the agent
actually noticing what it could get away with, not assumed: (1) the color-literal
regex only recognized hex/`rgb()`/`hsl()`, never the newer CSS color functions
(`oklch()`, `oklab()`, `lab()`, `lch()`, `color()`) — a real gap, not theoretical,
since Tailwind v4's own default generated tokens commonly use `oklch()`. (2) the hook
only ever matched `*.scss`/`*.css`/`*.html`, never `*.ts` — but this project's own
components use Angular's inline-template pattern (`angular.md` explicitly prefers it
for small components), so a color literal dropped directly into an inline
`template:`/`styles:` string was completely invisible to this hook. Fixed both,
verified with real cases (`oklch()` in `.scss` now blocks; a hex color inside an
inline `.ts` template now blocks; plain non-color `.ts` content and legitimate
`var(--...)` usage still correctly pass) — and specifically verified this project's
own real bundle config files (`auth0.config.ts`, `cognito.config.ts`,
`primeng-theme.config.ts`, `oauth.config.ts`) don't trigger false positives now that
`.ts` is scanned. Separately confirmed `check-raw-tailwind-utility.sh` already
covered `.ts` correctly, and that a Tailwind arbitrary-value hex literal
(`bg-[#ff0000]`) was already caught by the hex regex regardless of file type — no
fix needed for either of those.

**A real, confirmed documentation inaccuracy**, independently found (not the same
finding as any prior session): `angular.md`'s "Zoneless" section asserted every
project has an explicit `provideZonelessChangeDetection()` call in `app.config.ts`,
and that every `TestBed` needs the matching provider. Verified via a real fresh v21
generation that this is **simply false for v21+** — no explicit provider call
exists anywhere (confirmed: real `app.config.ts` content, real `angular.json` with
no `polyfills` field), and the project is zoneless purely by `zone.js` never being
added in the first place. The claim is only true for v19/v20, where
`enableZonelessForLegacyVersion()` deliberately adds the explicit call (those
versions don't default to zoneless). Fixed with real, version-conditional content
(`computeZonelessGuidance()`, same pattern as `TEST_RUNNER`/`FORMS_GUIDANCE`),
merging in the previously-separate, now-consistent `TestBed` guidance from the
Testing section rather than leaving two claims that could drift apart again.
Verified for both v19 and v21 via real generation, confirming each gets the
correct, accurate content — and a full real lint/build/test pass on the v21 case
afterward.

Full JSON validation and `generate.js` syntax check re-run clean after all changes.

## 35. Where things stand — everything through session 29 done

**Permanent addition to this project's testing discipline, effective immediately**:
**every full validation pass must include a real `ng build`, not just `ng lint` and
`ng test`.** This was learned the hard way this session — the missing-`environments/`
bug was invisible to lint and test across 6+ prior sessions and would have shipped to
every real user of the `rest`/`graphql`/`realtime` bundles undetected. `ng lint` + `ng
test` passing is not sufficient evidence a generated project actually works.

**Second permanent lesson, from this session**: **never use a bare `"*"` version for an
`@angular/*` dependency in a `deps.fragment.json` and assume it "resolves compatibly."**
It doesn't — it resolves to the literal latest published version, full stop, which can
silently diverge from whatever Angular version the rest of the project actually uses.
`generate.js`'s `applyBundle()` now handles this automatically (resolves `"*"` to match
the installed `@angular/core` version), but any *new* dependency added to a future
bundle should still be sanity-checked the same way `@angular/cdk` was here — by
generating a real project and running a real `npm install` + `ng build`, not by
assuming a version string is safe because it looked fine for a different package once.

**Third permanent lesson, from session 18**: **anything that string-matches or
splices generated framework output (CLI schematic output, config file structure) must
be tested against every Angular version this system claims to support, not just one.**
Both the selector-prefix fix and the ESLint-tightening fix were built and validated
only against v21/22's output format in earlier sessions, and both silently broke on
v20's differently-formatted (but equally valid) schematic output — found only because
v20 was actually generated and built this session. A fix that works on one version's
generated output is not proven to work on another's without testing it.

**Fourth permanent lesson, from session 25**: **`ng lint` + `ng build` passing is
still not sufficient evidence a generated app actually works at runtime** — the
missing-`provideHttpClient()` bug proves this at a level beyond the earlier
`environments/` lesson. That bug was invisible to lint (nothing to lint), invisible to
build (TypeScript compiles fine regardless of what's actually in the DI container at
runtime), and invisible to every unit test (tests always supply their own
`provideHttpClient()`/`provideHttpClientTesting()`, which masks the real
`app.config.ts` being broken). The only thing that would have caught this is actually
running the app in a browser and clicking something that makes an HTTP call — which
is exactly why the parallel feature-building exercise (not just structural
generation-tests) exists, and exactly the kind of bug this project's earlier
lint/build-only validation could never have found on its own.

**Fifth permanent lesson, from session 26**: **verify a testing tool's own scoping
assumptions before trusting what it reports as "didn't happen."** An agentic testing
session that reports "no hooks fired" can mean either "the code was compliant" or
"the hooks were never wired for this session at all" — and those are completely
different findings that look identical from the outside unless someone actually
checks *why* nothing fired, the way tester 4 did. Any future automated or
semi-automated testing setup for this project (or any Claude-Code-based guardrail
system generally) needs to independently confirm its enforcement layer was actually
active during the run, not just that no violation was observed.

**Sixth permanent lesson, from session 29**: **a "non-blocking warning" hook that
always exits 0 is not actually a warning — it's silent, full stop.** Claude Code
discards a `PostToolUse` hook's output entirely on exit 0 (confirmed via official
docs and multiple filed GitHub issues); only a non-zero, non-2 exit code produces a
visible-but-non-blocking message. Any hook in this project (or built for it in the
future) intended to warn without blocking must exit non-zero when it has something
to report — `check-missing-spec.sh` and `check-tsc.sh` had this exact bug from the
day they were built, invisible until the first genuinely hook-active test session
happened to trigger both conditions in the same run. When adding any new "warn, don't
block" hook going forward, verify its exit code choice against this explicitly rather
than assuming exit 0 is the safe default — for a pure warning, it's the wrong one.

1. **Upgrade Node on the test machine to at least v22.22.3 (or v24.15+/v26+).** This is
   now the clear #1 blocker, confirmed twice over (this sandbox, then the user's real
   machine): the test machine's Node (`v20.13.1`) is too old to run `ng new` for
   anything except v19 — Angular CLI 20/21 need `>=20.19`, and true latest (22) needs
   `>=22.22.3`. Without this upgrade, 5 of the 7 generation tests and both skill tests
   cannot progress past `ng new` at all, and true Angular 22 — the single biggest open
   question in this project — cannot be reached on this machine no matter how many
   more times the plan is re-run.
2. **Re-run Tests 1, 2, 3, 4, 6, 7 and both skill tests (4a/4b) after the Node
   upgrade** — these were all blocked at `ng new`, not tested and passing. Test 5 (v19)
   is genuinely done; nothing else in the generation matrix has real results yet.
3. **v20's `NG0908` fix specifically still needs real Karma confirmation** — Test 6 was
   blocked by the same Node constraint. Don't assume Test 5's pass extends to v20; the
   fix's code path genuinely differs between the two versions (session 18's
   quote-style and filename findings).
4. **Get a genuine (non-simulated) turn-by-turn run of the skill** — 4a/4b confirmed
   the skill's logic is internally consistent, but a sub-agent narrating both sides of
   the conversation in one pass doesn't prove live pacing behavior. A real human
   working through `/new-angular-project` conversationally, one message at a time,
   would close this gap.
5. **Resolve the deferred Karma-vs-Vitest question** (§23) — `angular.md` currently
   states "Test runner is Vitest" as a locked constant, which is simply false for any
   project generated with `--angular-version=19` or `20`. This needs either (a) a
   version-tiered content split in `angular.md`'s Testing section, (b) accepting the
   third-party AnalogJS schematic despite it breaking the "official schematics only"
   principle, or (c) declaring v19/v20 support explicitly test-runner-limited
   (Karma only, no Vitest) and documenting that clearly rather than leaving the
   contradiction unaddressed.
6. **Verify against true latest Angular (22.x)** — still the single biggest untested
   gap, now failed twice across two different environments. Every schematic used
   across sessions (`@angular-eslint/schematics`, `@jsverse/transloco`, `@angular/pwa`,
   `ng generate environments`, `husky init`, `@angular/material`, `tailwindcss`)
   resolved a compatible version automatically rather than the literal latest, purely
   due to Node-version constraints in every environment tried so far. Given this
   project has found both a production-build-breaking bug and a peer-dependency bug
   that lint/test alone couldn't catch, **this verification matters more than ever** —
   there could be other version-specific issues only a real Angular 22 + sufficient
   Node build would surface.
7. **Re-run the full audit pattern from §13** — now covering 9 axes across 25 total
   bundle options, 13 hooks, and a substantially larger `angular.md`/`architecture.md`
   — this has caught something new literally every time it's been tried, no reason to
   expect that stops now.
8. **Verify Playwright e2e test execution on a real machine** — this sandbox's
   network restrictions blocked the Chrome-for-Testing download, so only
   generation/lint/build were confirmed for the `e2e:playwright` bundle, not an
   actual passing e2e test run.
9. Multi-select per axis, the open-axis "unsure" default behavior, other previously
   flagged "not fully resolved" items, and any further Category B candidates remain
   open — revisit only if real use surfaces a need.

