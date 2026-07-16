---
name: new-angular-project
description: Generate a new company-standard Angular project by asking the client/PO/designer a short set of questions, then running the deterministic generate.js script. Use when someone wants to scaffold a new Angular application, start a new client project, or create a boilerplate repo with the company's guardrails.
---

# New Angular Project — Conversational Wrapper

## Your role in this skill (read first)

You are the conversational front-end for `scripts/generate.js`, nothing more. **You must
never hand-write, copy, or assemble any project files yourself as part of this skill.**
Your only two jobs are:
1. Ask the questions below, in order, and collect the answers.
2. Call `node scripts/generate.js` with the corresponding flags, then show the user its
   output verbatim (including any `⚠️ Known issue` warnings or validation failures —
   do not summarize these away or soften them).

This split exists deliberately (see `CONTEXT.md` §2): `generate.js` is deterministic —
same flags always produce the same repo. If you started editing files yourself here,
that guarantee breaks. If a step in `generate.js`'s output fails, report the failure
plainly and stop; do not try to work around it by editing the generated project by
hand.

**Who runs this skill:** a technical person (developer), typically informed by
requirements the PO/Designer already gathered from the client — not the non-technical
person themselves. The non-technical person only starts working *inside* the repo this
skill produces, once it's already generated and handed off. See `CONTEXT.md` §1 for the
full handoff sequence.

## Step 1 — Find out who you're talking to

Ask: **"Is the client (or whoever's answering these) technical, or non-technical?"**
This decides which question phrasing you use below — Case 1 (technical) or Case 2
(non-technical). Don't guess from context; ask directly if it isn't already obvious from
the conversation.

## Step 2 — Target Angular version → `--angular-version`

Ask **the skill's operator directly** (this is an infrastructure decision, not a
client-facing requirement — don't route it through Case 1/Case 2 phrasing):

**"Does this project need to target a specific Angular version — usually because of an
existing client environment/hosting constraint — or should it use the company's
current default (latest stable Angular)?"**
- Latest stable (the default — pick this unless there's a specific reason not to) →
  omit `--angular-version` entirely (don't pass the flag at all).
- A specific version (19, 20, 21, or 22) → `--angular-version=<number>`

**Ask this before the 8 axis questions below, not after** — the chosen version can
make specific answers to those questions invalid, and it's better to know that before
asking them than to have to walk back an answer afterward. If a specific version is
chosen, keep these real, verified constraints in mind while asking the axis questions
(don't just find out later when `generate.js` refuses):
- **Angular 19 or 20**: `auth: oauth-sso` (needs ≥22) and `state: ngrx-signalstore` /
  `styling: primeng` (both need exactly 21) are **not available** — if the person's
  answers to those questions would pick one of these, tell them it's incompatible with
  the chosen version and ask them to pick differently (or reconsider the version).
- **Angular 21**: `auth: oauth-sso` still not available (needs ≥22); `ngrx-signalstore`
  and `primeng` **are** available here specifically (this is their only supported
  version).
- **Angular 22 (latest, the default)**: `ngrx-signalstore` and `primeng` are **not**
  available (their peer dependencies cap at 21); `oauth-sso` is available.
- Also worth knowing, not blocking: Angular 19/20 default to Karma for testing and
  zone.js-based change detection (this project's guardrails still apply, but
  `angular.md`'s "Test runner is Vitest" and zoneless-related content describes 21/22's
  defaults specifically — see `CONTEXT.md` §23 for the full account of what differs).

If the operator picks a version and then separately answers an axis question in a way
that conflicts with the table above, stop and point out the conflict directly — same
as the existing `rbac`+`auth:none` contradiction check below — rather than letting
`generate.js` be the first thing to catch it.

## Step 3 — Ask the 9 required questions, one at a time

Ask these **one at a time**, not all at once — wait for each answer before asking the
next. Use Case 1 phrasing if the person said technical, Case 2 if non-technical.

---

### Q1 — Authentication → `--auth`

**Case 1 (technical):** "What authentication mechanism does this application need?"
- No auth (public app) → `none`
- Basic email/password (self-managed users) → `basic-auth`
- Generic OAuth / OIDC (Google, Microsoft, a custom identity provider) → `oauth-sso`
- Auth0 specifically → `auth0`
- AWS Cognito specifically (an existing user pool, not Amplify-provisioned) → `cognito`
- Enterprise SAML / Identity Provider integration → `saml`

**Case 2 (non-technical):** "How do people get into your app?"
- Anyone can use it without logging in → `none`
- People create an account with an email and password on your site → `basic-auth`
- People log in using an account they already have, like Google or Microsoft, via a
  generic setup → `oauth-sso`
- Specifically using Auth0 as the login provider → `auth0`
- Specifically using AWS Cognito as the login provider → `cognito`
- Your company already has a system that manages employee logins (enterprise single
  sign-on) → `saml`

*Note: if the client hasn't decided between two providers yet (e.g. "Auth0 or
Cognito, still deciding"), that's a real, common answer — don't force a choice here.
Default to `none` for now (matches "not yet wired") and note the undecided options in
`--description`, so a developer can wire the real choice once decided rather than
generating something that has to be un-done later.*

---

### Q2 — Data layer → `--data-layer`

**Case 1 (technical):** "How will the frontend get its data — REST API, GraphQL, or does
it need real-time/live updates (WebSockets)? Or is there no backend yet — and if so, do
you want a real local fake API (json-server) or just static in-memory data?"
- REST API → `rest`
- GraphQL → `graphql`
- Real-time (WebSocket live data) → `realtime`
- No backend yet, but want a real local fake REST API to develop against (real HTTP
  calls, real network errors, a `db.json` file you can add resources to) → `json-server`
- No backend yet, simplest possible static/in-memory data, no real HTTP at all → `mock`

**Case 2 (non-technical):** "Where does the information in your app come from?"
- It's just for show right now, and it doesn't matter how realistically it behaves →
  `mock`
- It's just for show right now, but you want it to behave like a real connected app
  while it's being built (this is the more common choice when there's no backend yet)
  → `json-server`
- There's already a system/database this app needs to talk to → `rest` (default — see
  note below)
- We need it to update instantly for everyone at the same time (like a live chat or
  dashboard) → `realtime`

*Note: if Case 2 answers "there's already a system," and the person can't tell you
whether it's REST or GraphQL, default to `rest` — it's the more common case — but flag
to a developer that this should be confirmed.*

*Note on `json-server` vs `mock`: most "no backend yet" cases should default to
`json-server`, not `mock` — it exercises the real HTTP/interceptor chain (closer to
how the app will behave once a real backend exists) with almost no extra setup cost.
Reach for plain `mock` only when even a local fake server is more than what's needed
(e.g. a very simple, mostly-static page).*

---

### Q3 — State complexity → `--state`

**Case 1 (technical):** "Is application state mostly local to individual screens, or
shared across many features (e.g. a shopping cart, a multi-step workflow, a dashboard
with cross-cutting filters)?"
- Local/simple → `signals-only`
- Shared/complex → `ngrx-signalstore`

**Case 2 (non-technical):** "Does information need to be shared between different
screens as someone uses the app (like a shopping cart that follows them around), or does
each screen work on its own?"
- Each screen is independent → `signals-only`
- Yes, things need to carry across screens → `ngrx-signalstore`

*If `ngrx-signalstore` is selected, `generate.js` will print a known compatibility
warning about Angular version peer dependencies — show this to the user/developer
verbatim, don't hide it.*

---

### Q4 — Roles & access → `--roles`

**Case 1 (technical):** "Does every user have the same permissions, or are there
different roles (e.g. admin vs. standard user) with different access to
screens/actions?"
- Single role → `single-role`
- Role-based access control → `rbac`

**Case 2 (non-technical):** "Do all your users see and do the same things, or are there
different types of users with different access (like regular users vs. admins)?"
- Everyone has the same access → `single-role`
- There are different types of users with different permissions → `rbac`

*Hard rule: `rbac` requires an auth option other than `none` (see the `requires` field
in `roles/rbac/manifest.json`). If the person answered Q1 with "no login" and Q4 with
"different user types," that's a contradiction — point it out and ask them to resolve
it before proceeding. Don't silently pick one.*

---

### Q5 — Deployment target → `--deploy-target`

**Case 1 (technical):** "Does this need to be indexed by search engines / need fast
first-paint for SEO (→ SSR), or is it strictly behind-login / internal (→ SPA is fine)?"
- SPA (client-side rendered only) → `spa`
- SSR (server-side rendered) → `ssr`

**Case 2 (non-technical):** "Does this app need to show up well in Google search
results or load instantly for visitors who've never been there before — like a
marketing site — or is it mostly for people who are already logged in, using it as a
tool?"
- Needs to be found on Google / load fast for new visitors → `ssr`
- It's a tool people log into, not something to be found via search → `spa`

*If `ssr` is selected, `generate.js` will run a real `ng add @angular/ssr` command as
part of generation — this takes longer and needs network access. Mention this to the
user so the wait isn't a surprise.*

---

### Q6 — Internationalization → `--i18n`

**Case 1 (technical):** "Does this need to support multiple languages with runtime
switching, or is a single language fine?"
- Single language → `single-language`
- Multiple languages, switchable in-app without a rebuild → `multi-language`

**Case 2 (non-technical):** "Will people using this app need to switch between
different languages, or is it just for one language?"
- Just one language → `single-language`
- Yes, people need to switch languages → `multi-language`

*Note: this project's `multi-language` option uses Transloco (an in-app language
switcher, no rebuild needed) rather than Angular's own compile-time i18n system, which
would require a separate build per language served at different URLs. If a project
specifically needs the latter (e.g. for locale-specific SEO), flag that to a developer
rather than assuming Transloco is always right.*

---

### Q7 — Offline / installable support → `--offline`

**Case 1 (technical):** "Does this need offline support or to be installable as a PWA
(service worker, works without a network connection), or is a standard always-online
web app fine?"
- Standard, always-online → `standard`
- Offline-capable / installable (PWA) → `pwa`

**Case 2 (non-technical):** "Does this need to work when someone's internet connection
drops, or be something people can 'install' on their phone/computer like an app — or is
it fine to require an internet connection at all times?"
- Fine to always require internet → `standard`
- Needs to work offline / be installable → `pwa`

---

---

### Q8 — Component library / styling → `--styling`

**Case 1 (technical):** "Do you want a component library — Angular Material, PrimeNG —
or a custom/Tailwind setup, or nothing at all (plain CSS)?"
- Angular Material → `material`
- PrimeNG → `primeng`
- Custom/Tailwind (utility-first, no pre-built components) → `tailwind`
- Nothing / plain CSS → `none`

**Case 2 (non-technical):** "Do you want us to use a ready-made design system (like
Google's Material Design), a different pre-built component set, or build the visual
style fully custom for this project?"
- Google's Material Design look → `material`
- A different pre-built component set (ask if they have one in mind — PrimeNG is a
  common choice) → `primeng`
- Fully custom visual design → `tailwind`
- Not sure / keep it simple for now → `none`

*Note: `primeng`'s peer dependency may lag behind this project's locked Angular version
— `generate.js` will print a known-issue warning if so. Show it to the user/developer
verbatim.*

---

### Q9 — End-to-end testing → `--e2e`

**Case 1 (technical):** "Do you want end-to-end/browser testing set up — Playwright —
or just unit tests for now?"
- Playwright → `playwright`
- No, unit tests only → `none`

**Case 2 (non-technical):** "Should we set up automated testing that checks the whole
app works by actually clicking through it in a browser, or is testing individual
pieces enough for now?"
- Yes, full click-through testing → `playwright`
- Just the basics for now → `none`

*Note: Angular itself has no single official e2e default (Cypress, Playwright,
WebdriverIO, Nightwatch, and Puppeteer are all real options via `ng e2e`) — this
project only has a pre-built option for Playwright specifically. If someone wants a
different tool, that's a manual setup a developer does after generation, not
something this generator scaffolds.*

---

## Step 4 — Cosmetic/open questions (no bundle impact)

These do **not** map to `generate.js` flags — they're for the human designer to keep in
mind, not something this generator enforces. Ask briefly, then fold the answer into
`--description`:

- Visual theme / brand colors / typography
- Anything else worth noting in the project's one-line description

Combine these into a single sentence for `--description="..."`. Component library
choice is **no longer** a cosmetic question — see Q8 above; it's a real fixed axis with
actual guardrails now, not something to leave unenforced.

## Step 5 — Project name and repo

Ask for:
1. **A project name** — lowercase, letters/numbers/hyphens only (Angular CLI naming
   rule). If the person gives something else, suggest a valid slug and confirm it with
   them rather than silently converting it.
2. **The empty GitHub repository URL** to push to (must already exist and be empty —
   this skill/script does not create the repo itself).

## Step 6 — Run generate.js

Confirm the full set of answers back to the user in one short summary before running
anything ("Angular version: <latest, or the specific number>, Auth: X, Data layer: Y,
State: Z, Roles: W, Deploy target: V, i18n: U, Offline: T, Styling: S, E2E: E, pushing to
<repo>— is that right?"). Then, once confirmed, run:

```bash
GITHUB_TOKEN=<token, if pushing> node scripts/generate.js \
  --project-name=<name> \
  --angular-version=<number, OMIT entirely if latest was chosen> \
  --auth=<value> \
  --data-layer=<value> \
  --state=<value> \
  --roles=<value> \
  --deploy-target=<value> \
  --i18n=<value> \
  --offline=<value> \
  --styling=<value> \
  --e2e=<value> \
  --description="<combined cosmetic notes>" \
  --repo=<url>
```

If the person hasn't provided a `GITHUB_TOKEN`, ask for one (a fine-grained PAT scoped
to just that repo, `Contents: Read and write`) before running with `--repo` set — same
guidance as setting up push access for this generator project itself. If they'd rather
generate locally first without pushing, omit `--repo` entirely and mention they can push
manually later.

## Step 7 — Report the result, verbatim

Show the script's actual output — including `✓` progress lines, any `⚠️  Known issue`
warnings, and especially any `❌` failure — rather than paraphrasing. If it fails, don't
try to patch around it by hand-editing the generated project; report the failure and
let the user decide (fix the flags and re-run, or ask a developer).
