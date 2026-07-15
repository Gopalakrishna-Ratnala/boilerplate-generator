---
name: run-feature-test
description: Autonomously run one tester's assigned feature-building test for the boilerplate-generator project - generates the assigned bundle combination, builds a fixed feature spec, verifies it, writes a report, and pushes it. Takes a tester number (1-6) as input. Use when someone says "run feature test N" or "run as tester N" for this generator's parallel testing exercise.
---

# Autonomous Feature Test Runner

## Read this first: your entire job is to run to completion with zero questions

**You must never pause to ask the human anything during this skill.** This is
explicitly designed to run unattended — someone is starting this and walking away
(a lunch break, not a monitored session). If something is ambiguous or you're unsure
which of two reasonable choices to make, **pick the more conservative/standard one,
write down what you chose and why in the report's "Assumptions made" section, and keep
going.** A stalled skill waiting on a question nobody is there to answer is a failure
of this skill, not a legitimate pause point.

The only acceptable reason to stop early is a hard, unrecoverable error (e.g.
`generate.js` itself refuses, `npm install` fails outright) — even then, don't ask a
question: write what happened into the report as-is, commit and push that report, and
end.

**Two specific things that have caused real friction in practice, avoid both:**
- **Do not combine `cd <path> && <command> > <file>` in one compound command.**
  Claude Code's own built-in safety check requires manual approval for this exact
  pattern (guarding against path-resolution tricks), which defeats the zero-questions
  design here. If you need to redirect output, do it in a separate step from any `cd`,
  or just let the command's normal output come back through the tool call rather than
  redirecting to a file at all — that's simpler and avoids the prompt entirely.
- **Do not rely on the `timeout` command.** It does not exist by default on macOS
  (only on Linux/GNU coreutils) and will fail with "command not found." If a command
  seems to be hanging, the far more likely cause is the repository being cloned inside
  a cloud-synced folder (iCloud Drive's "Desktop & Documents" sync, Dropbox, OneDrive,
  etc.) — `git`/filesystem operations can hang for minutes there for reasons that have
  nothing to do with this project. If you observe a `git`/`node`/`npm` command hang for
  an unreasonably long time, note that in the report as a likely environment issue
  (suggest re-cloning outside any cloud-synced folder) rather than fighting it with
  workarounds — don't spend the session's effort defensively working around a slow
  filesystem.

## Step 1 — Get the tester number

The human invoking this will give you a number 1–6 (e.g. "run feature test 3" or
"/run-feature-test 3"). If genuinely no number was given at all, default to picking
the lowest-numbered assignment below whose report file doesn't already exist in
`test-reports/` — don't ask which one to use.

## Step 2 — Look up your assignment (inlined here, not read from another file)

| # | Angular version flag | Bundle flags |
|---|---|---|
| 1 | (omit — latest) | `--auth=basic-auth --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none` |
| 2 | (omit — latest) | `--auth=oauth-sso --data-layer=graphql --state=signals-only --roles=rbac --deploy-target=spa --i18n=single-language --offline=standard --styling=material` |
| 3 | `--angular-version=21` | `--auth=basic-auth --data-layer=rest --state=ngrx-signalstore --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=primeng` |
| 4 | (omit — latest) | `--auth=basic-auth --data-layer=mock --state=signals-only --roles=single-role --deploy-target=ssr --i18n=multi-language --offline=pwa --styling=tailwind` |
| 5 | `--angular-version=19` | `--auth=saml --data-layer=realtime --state=signals-only --roles=rbac --deploy-target=spa --i18n=single-language --offline=standard --styling=none` |
| 6 | (omit — latest) | `--auth=none --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none` |

If your assigned Angular version's `ng new` fails because the local Node version is too
old (check `node --version` against: v19/v20 need Node `>=20.19`, v21 needs `>=20.19`,
v22/latest needs `>=22.22.3`) — don't ask what to do. Try the next-lowest Angular
version this assignment could reasonably use (e.g. fall back from 22 to 21 to 20 to 19
in that order) and clearly note the substitution and why in the report. Only stop if
even v19 fails.

## Step 3 — Generate (no confirmation, just run it)

```bash
cd boilerplate-generator   # the cloned generator repo
node scripts/generate.js \
  --project-name=feature-test-<N> \
  <your assignment's angular-version flag, if any> \
  <your assignment's bundle flags> \
  --out-dir=/tmp/feature-test-<N> \
  --dry-run=false
```

If this fails for a real reason (not the Node-version case above, which has its own
handling), capture the exact error, write it into the report, commit and push, and
stop — don't try to work around a genuine generator failure yourself.

## Step 4 — Build this exact feature, no interpretation needed

Open/work in `/tmp/feature-test-<N>/feature-test-<N>`. Build a "Products" feature per
this **fully specified** description — every decision that might otherwise require
asking someone is already made below:

- **Route**: `products`, lazy-loaded, added to the existing routes file.
- **Data**: a `Product` model with `id: string`, `name: string`, `price: number`. Use
  this project's already-selected `data-layer` bundle's pattern to fetch/store products
  (if `mock`, seed 5 example products in-memory; if a real backend pattern like `rest`
  or `graphql`, write the service call assuming a conventional endpoint/schema — a
  backend doesn't need to actually exist for this test).
- **List view**: a component showing all products (name + price), using this project's
  standard list-rendering pattern (`@for` with `track`).
- **Search**: a single text input above the list. Filter the visible list by matching
  `name` (case-insensitive substring match), reactively as the user types. Implement
  the filtering using this project's `state` bundle's actual pattern (a signal +
  `computed()`, or the SignalStore pattern if that's what's selected) — don't invent a
  different state approach.
- **Delete**: a delete button/icon on each product row. Use the browser's native
  `confirm()` for the confirmation step — do **not** build a custom confirmation
  modal/dialog component for this test. On confirm, remove the product from the list.
- **Role gating**: if this project's `roles` bundle is `rbac`, wrap the delete
  button with this project's `*hasRole`/role-guard pattern so only an admin role sees
  it. If `roles` is `single-role`, skip this entirely — don't add role logic to a
  project that doesn't have the concept.
- **Add form**: a small form with two fields — `name` (text, required) and `price`
  (number, required, must be greater than 0). Toggle its visibility with a simple
  signal boolean and a button (e.g. "+ Add Product" / "Cancel") — don't add routing or
  a modal for this, just conditionally rendered markup (`@if`). **Use whichever forms
  approach this specific generated project's `.claude/rules/angular.md` actually
  documents** — check that file rather than assuming: it will say Signal Forms
  (`@angular/forms/signals`) for Angular 21+ targets (which is most assignments below,
  since "latest" resolves to 21+), or Reactive Forms for v19/v20 targets. Do not
  default to Reactive Forms without checking — that would be wrong for the majority of
  these assignments now that Signal Forms is this project's actual v21+ default. On
  submit with a valid form, add the new product to the top of the list and close the
  form.
- **Styling**: if this project has a `styling` bundle other than `none` (Material,
  PrimeNG, or Tailwind), use its actual components/utilities for this feature,
  following that bundle's own rule file. If `styling` is `none`, write plain,
  reasonably tidy component-scoped CSS/SCSS — don't reach for a library that isn't
  selected.
- **Tests**: write a spec for the new component(s) covering at minimum: initial
  render, that search actually filters, and that delete removes an item — don't skip
  tests to save time.

Work through this the way you normally would given this project's actual `.claude/`
guardrails — the point of this exercise is observing how those guardrails behave
against a real, non-trivial feature, not producing a specific artificial outcome.

## Step 5 — Verify (run these yourself, don't skip any)

```bash
npx @angular/cli lint
npx @angular/cli build
npx @angular/cli test --watch=false
```
Capture the real pass/fail and any real error output for each.

## Step 6 — Write the report yourself, fully filled in

Copy `test-reports/TEMPLATE.md` (in the generator repo clone) to
`test-reports/tester-<N>-<short-bundle-description>-<unix-timestamp>.md` — **include a
timestamp suffix** (e.g. `date +%s`), not just the tester number. This is deliberate:
if whoever's coordinating accidentally gives two people the same number, a timestamp
suffix means they still write two different files instead of silently colliding on one
— cheap insurance against a human mistake, not just a technical one. Fill in every
section based on what actually happened during Steps 3–5.

**Critical: include the actual code, not just a summary.** Your own self-assessment of
whether the feature follows this project's rules is not sufficient on its own — the
central-brain session needs to independently verify compliance against the real rule
files, not just trust a report saying "looks compliant." In the report's "Generated
code" section, paste the **full content** of every new or meaningfully-changed file
under `src/app/` (the feature component(s), any new service/state file, the updated
routes file) as fenced code blocks with the file path labeled above each one. Do not
summarize or excerpt — paste the whole file. This is the part of the report that
actually matters most; everything else is secondary to it.

Also fill in the "Assumptions made" section (add it to the template if not already
present) listing every judgment call made per the "never ask, pick and document" rule
in Step 1.

## Step 7 — Commit and push the report only, then clean up

```bash
cd boilerplate-generator
git add test-reports/tester-<N>-<short-bundle-description>-<timestamp>.md
git commit -m "test-report: tester <N> (<short bundle description>)"
```

**Push with retries — a single `pull --rebase` + `push` isn't enough with several
people genuinely pushing around the same time.** Attempt this up to 5 times before
giving up:
```bash
for i in 1 2 3 4 5; do
  git pull --rebase && git push && break
  echo "Push attempt $i failed (likely a race with another tester's push) — retrying..."
  sleep $((RANDOM % 5 + 1))
done
```
The random short sleep between attempts is deliberate — if two people's retry loops
are both firing on a fixed interval, they can keep losing to each other indefinitely;
a small random jitter breaks that pattern. If all 5 attempts genuinely fail, don't ask
a question — note in the report that the push failed after 5 attempts (this itself is
useful information) and leave the committed-but-unpushed report locally so it isn't
lost; whoever's coordinating can push it manually afterward.

```bash
rm -rf /tmp/feature-test-<N>
```

Do not commit or push anything from `/tmp/feature-test-<N>` itself — only your report
file. Do not touch `base/`, `bundles/`, or `scripts/generate.js` under any
circumstances, even if you're confident you've found a real bug — describe it fully in
the report instead; the central-brain session makes the actual fixes.

## Step 8 — End with a short summary, not a question

Print a brief final summary (assignment number, pass/fail on lint/build/test, whether
the report pushed successfully) and stop. Don't ask "should I do anything else" or
similar — the human isn't there to answer.
