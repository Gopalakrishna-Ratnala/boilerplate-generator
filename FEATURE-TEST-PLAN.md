# Feature Test Plan — Parallel Real-World Verification

> Purpose: everything tested so far (`TESTING-PLAN.md`) checks whether a generated
> project *compiles, lints, and passes its own starter tests*. It does not check
> whether the `.claude/` guardrails (hooks + rules) actually behave correctly when
> someone builds real features on top of the generated project — which is the entire
> point of this system. This plan closes that gap using multiple parallel Claude Code
> sessions, each on its own account, each testing a different bundle combination, all
> building the **same feature task** so results are directly comparable.

## How this works

1. **One person = one bundle combination = one Claude Code session**, working
   independently. Nobody edits the generator itself (`base/`, `bundles/`,
   `scripts/generate.js`) — only the **central brain** session does that, to avoid
   conflicting fixes. Testers only generate a project and build inside it.
2. Everyone builds the **same feature** (below) — this makes results comparable: if
   Tester A's hook fired on something and Tester B's didn't, that's a real, specific
   thing to investigate, not noise from two different tasks.
3. Each tester writes their findings into **their own report file** and pushes it to
   this repo — since everyone's report is a uniquely-named new file, not a shared one,
   concurrent pushes from multiple people should never actually conflict.
4. The central brain session reviews every report and makes the real fixes.

---

## Step 0 — Before you start (every tester)

```bash
git clone https://github.com/Gopalakrishna-Ratnala/boilerplate-generator.git
cd boilerplate-generator
node --version   # note this down — you'll need it in your report
```

If your Node version doesn't meet the target Angular version's requirement (see the
assignment table below), either upgrade Node or pick the nearest version your Node
supports and note the substitution in your report.

## Step 1 — Generate your assigned combination

Find your assignment in the table below (ask whoever's coordinating which number
you are, or just pick an unclaimed one if self-organizing). Generate **locally only,
no `--repo`**:

```bash
node scripts/generate.js \
  --project-name=feature-test-<your-number> \
  <your assigned flags> \
  --out-dir=~/feature-test-<your-number> \
  --dry-run=false
```

| # | Angular version | Flags | What this specifically stresses |
|---|---|---|---|
| 1 | latest (omit `--angular-version`) | `--auth=basic-auth --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none` | The simplest baseline — signals-only state, no role gating, no UI library. Establishes the control case everyone else compares against. |
| 2 | latest | `--auth=oauth-sso --data-layer=graphql --state=signals-only --roles=rbac --deploy-target=spa --i18n=single-language --offline=standard --styling=material` | Role-gating (`rbac`) + a real UI library (Material) + GraphQL instead of REST. |
| 3 | 21 | `--angular-version=21 --auth=basic-auth --data-layer=rest --state=ngrx-signalstore --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=primeng` | The only version where `ngrx-signalstore` + `primeng` are both valid — state management via SignalStore instead of plain signals. |
| 4 | latest | `--auth=basic-auth --data-layer=mock --state=signals-only --roles=single-role --deploy-target=ssr --i18n=multi-language --offline=pwa --styling=tailwind` | SSR + PWA + Tailwind/CDK + no real backend yet (mock data layer) — the "custom widget must use CDK" rule gets a real workout here. |
| 5 | 19 (or your nearest supported version) | `--angular-version=19 --auth=saml --data-layer=realtime --state=signals-only --roles=rbac --deploy-target=spa --i18n=single-language --offline=standard --styling=none` | Legacy Angular version + SAML (backend-delegated auth) + real-time data layer — also re-exercises the zoneless fix from a genuinely different feature-building angle, not just `ng test` on the starter spec. |
| 6 | latest | `--auth=none --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none` | Public app, no auth at all — confirms nothing auth-related leaks in or gets assumed when `auth: none` is selected. |

If you're tester 5 and your Node can't reach v19 either, use whatever's closest to
what your machine supports and say so clearly in your report — an honest substitution
beats a silently-skipped test.

## Step 2 — Open the generated project in Claude Code, then build this feature

**Give Claude Code this exact prompt** (paste as-is, don't paraphrase it — comparability
across testers depends on everyone starting from the same instruction):

> Build a "Products" feature for this app: a page that lists products fetched from the
> backend, with a search input that filters the list as you type. Each product shows a
> name, price, and a delete button — clicking delete asks for confirmation, then
> removes it. Add a small form to create a new product (name + price, both required,
> price must be a positive number) that appears in a dropdown/panel you toggle open and
> closed. Style it reasonably. If this project has role-based access control, only
> show the delete button to admins. Write it the way you normally would — don't go out
> of your way to test any particular rule, just build the feature.

Let Claude Code work through this naturally — don't intervene unless it gets stuck or
does something you want to note. The point is observing *unprompted* behavior against
the real guardrails, not a scripted walkthrough.

## Step 3 — While it works, and after, note down

- **Every time a hook blocked something** — was the block correct (a real problem) or
  a false positive (blocked something that was actually fine)? Include the exact hook
  name and message.
- **Anything that *should* have been blocked but wasn't** — did Claude Code do
  something this project's rules explicitly say not to do, without a hook catching
  it?
- **Anywhere the rules/`CLAUDE.md` guidance was unclear, missing, or contradictory** —
  did Claude Code have to guess, ask you something the rules should have already
  answered, or pick an approach inconsistent with what's documented?
- **Final state**: run `ng lint`, `ng build`, and `ng test` yourself once the feature
  is "done" per Claude Code. Record pass/fail for each, same as `TESTING-PLAN.md`.

## Step 4 — Write your report and push it

Copy `test-reports/TEMPLATE.md` to `test-reports/tester-<your-number>-<short-bundle-name>.md`
(e.g. `test-reports/tester-2-oauth-material.md`), fill it in, then:

```bash
cd boilerplate-generator   # back in the CLONE, not your generated test project
git add test-reports/tester-<your-number>-<short-bundle-name>.md
git commit -m "test-report: tester <your-number> (<bundle summary>)"
git pull --rebase
git push
```

**Don't touch anything outside `test-reports/your-own-file.md`.** If you spot what
looks like a real generator bug, describe it fully in your report rather than fixing
it yourself — the central brain session reviews every report and makes the actual
fixes in one place, so two people don't independently patch the same thing two
different ways.

Delete your local generated test project (`~/feature-test-<n>`) once your report is
pushed — same clean-up discipline as `TESTING-PLAN.md`.

---

## For the central brain session (whoever reviews these)

Once reports start arriving in `test-reports/`, read every one, cross-reference
findings that appear in multiple reports (a hook misfiring for two different testers
on two different bundle combos is a much stronger signal than one person's isolated
report), and fix the generator at the source — `base/` for anything universal,
the specific `bundles/<axis>/<option>/` for anything bundle-specific. Update
`CONTEXT.md` with a new dated section per fix, same discipline as every prior session.
Leave the `test-reports/*.md` files in the repo as a historical record rather than
deleting them after reading.
