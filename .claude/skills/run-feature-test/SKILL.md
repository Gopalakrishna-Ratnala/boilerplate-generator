---
name: run-feature-test
description: Run one tester's assigned feature-building test for the boilerplate-generator project - generates the assigned bundle combination, then hands off clear instructions for testing the generated project's guardrails in a properly-scoped second session (required by a real Claude Code platform limitation), then writes and pushes the report. Takes a tester number (1-6) as input. Use when someone says "run feature test N" or "run as tester N" for this generator's parallel testing exercise.
---

# Feature Test Runner (2-phase — read this first, it's not optional)

## Why this is 2 phases, not 1 fully autonomous run

Found via a real test report (tester 4, session 25): **Claude Code only loads
`.claude/settings.json` (and therefore hooks) from the session's *startup* working
directory** — this is a confirmed, filed Claude Code platform limitation
(github.com/anthropics/claude-code issues #52934, #10367), not something either this
skill or the generator can work around. If this skill's whole flow runs from inside
the `boilerplate-generator` clone (which has no `.claude/settings.json` of its own —
only `.claude/skills/`), then every file written into the generated project at
`/tmp/feature-test-<N>/...` is written by a session whose hooks are **not** the
generated project's hooks. Every prior report's "no hooks fired" was not evidence the
code was compliant *because of* the hooks — the hooks never had a chance to fire at
all. The only reliable fix the Claude Code community has found for this class of
limitation is restarting Claude Code from the target directory — so that's what this
skill now requires, at the cost of losing full walk-away autonomy for the
feature-building step specifically. Generation, reporting, and pushing remain fully
autonomous; only the actual feature-building step needs a human to switch directories
and start a second session.

## General rule for both phases: never ask, pick and document

**Never pause to ask the human anything mid-phase.** If something is ambiguous, pick
the more conservative/standard choice, note it in the "Assumptions made" section
later, and keep going. The only acceptable early stop is a hard, unrecoverable error
— even then, don't ask a question, just report what happened.

**Two things that have caused real friction in practice, avoid both:**
- **Do not combine `cd <path> && <command> > <file>` in one compound command** —
  triggers Claude Code's own manual-approval security prompt. Redirect output
  separately from any `cd`, or just let normal tool-call output come back directly.
- **Do not rely on `timeout`** — absent on macOS by default. If a command hangs,
  suspect the repo is cloned inside a cloud-synced folder (iCloud Drive, Dropbox,
  OneDrive) and say so in the report rather than fighting it.

---

## PHASE A — in this session (the `boilerplate-generator` clone)

### Step 1 — Get the tester number

The human invoking this will give you a number 1–6. If genuinely no number was given,
default to the lowest-numbered assignment whose report file doesn't already exist in
`test-reports/` — don't ask which one to use.

### Step 2 — Look up your assignment (inlined here, not read from another file)

| # | Angular version flag | Bundle flags |
|---|---|---|
| 1 | (omit — latest) | `--auth=basic-auth --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none --e2e=none` |
| 2 | (omit — latest) | `--auth=oauth-sso --data-layer=graphql --state=signals-only --roles=rbac --deploy-target=spa --i18n=single-language --offline=standard --styling=material --e2e=none` |
| 3 | `--angular-version=21` | `--auth=basic-auth --data-layer=rest --state=ngrx-signalstore --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=primeng --e2e=none` |
| 4 | (omit — latest) | `--auth=basic-auth --data-layer=mock --state=signals-only --roles=single-role --deploy-target=ssr --i18n=multi-language --offline=pwa --styling=tailwind --e2e=none` |
| 5 | `--angular-version=19` | `--auth=saml --data-layer=realtime --state=signals-only --roles=rbac --deploy-target=spa --i18n=single-language --offline=standard --styling=none --e2e=none` |
| 6 | (omit — latest) | `--auth=none --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none --e2e=none` |

**Note on assignment 2 specifically**: `oauth-sso` requires Angular ≥22, which itself
requires Node ≥22.22.3. If your Node version can't reach 22 (check `node --version`),
this assignment is genuinely unrunnable on your machine — don't attempt a version
fallback (v21/v20/v19 would all fail the same `oauth-sso` version-floor check
regardless of Node). Report this as a hard stop with the exact error, same as any
other unrecoverable failure — this is correct, expected behavior from the generator's
version-gating validation, not a bug.

For any other assignment, if `ng new` fails on Node-version grounds (v19/v20/v21 need
Node `>=20.19`, latest needs `>=22.22.3`) — try the next-lowest Angular version this
assignment could reasonably use, note the substitution, and continue. Only stop if
even v19 fails.

### Step 3 — Generate (no confirmation, just run it)

```bash
cd boilerplate-generator
node scripts/generate.js \
  --project-name=feature-test-<N> \
  <your assignment's angular-version flag, if any> \
  <your assignment's bundle flags> \
  --out-dir=/tmp/feature-test-<N> \
  --dry-run=false
```

If this fails for a real reason (not the Node/version cases above, which have their
own handling), capture the exact error, write it into the report now (skip to Step 5
below with no code/hooks sections — there's nothing to report), and stop.

### Step 4 — Hand off to a new session, then STOP and wait

Print this to the human **verbatim**, then end your turn — don't do anything else
until they come back with Phase B's output:

> Generation complete: `/tmp/feature-test-<N>/feature-test-<N>`.
>
> To actually test this project's guardrails (not just generate code), open a **new
> terminal window**, then run:
> ```
> cd /tmp/feature-test-<N>/feature-test-<N>
> claude
> ```
> Once that new session starts, paste the exact prompt from this skill's "PHASE B"
> section below into it.
>
> When that session finishes, copy its entire final summary output and paste it back
> to me here, and I'll write and push the report.

---

## PHASE B — prompt for the human to paste into the NEW session (started inside the generated project)

*(This is the literal text to paste — reproduced here so Phase A can show it
verbatim. If you are the session receiving this prompt: you're now running with the
correct working directory, so this generated project's actual `.claude/settings.json`
hooks are active for real. Build the feature for real, then output the structured
summary at the end — don't ask questions, same "pick and document" rule as always.)*

> Build a "Products" feature for this app, fully specified below — every decision that
> might otherwise need asking is already made:
>
> - **Route**: `products`, lazy-loaded, added to the existing routes file.
> - **Data**: a `Product` model with `id: string`, `name: string`, `price: number`.
>   Use this project's already-selected `data-layer` bundle's pattern to fetch/store
>   products (if `mock`, seed 5 example products in-memory; otherwise write the
>   service call assuming a conventional endpoint/schema — no real backend needed).
> - **List view**: shows all products (name + price), using this project's standard
>   list-rendering pattern (`@for` with `track`) — or, if a `styling` bundle
>   documents a mandatory data-grid component (e.g. PrimeNG's `Table`), use that
>   instead, per that bundle's own rule file taking precedence for this case.
> - **Search**: a text input above the list, filtering by `name`
>   (case-insensitive substring), reactively as the user types, using this project's
>   actual `state` bundle pattern (plain signal + `computed()`, or SignalStore).
> - **Delete**: a delete button/icon per row. Use the browser's native `confirm()` —
>   no custom dialog component. On confirm, remove the product.
> - **Role gating**: if this project's `roles` bundle is `rbac`, gate the delete
>   button with this project's role-gating pattern so only an admin role sees it. If
>   `single-role`, skip entirely.
> - **Add form**: `name` (required) and `price` (required, > 0) fields, toggled via a
>   signal boolean + button, no routing/modal. **Check this project's own
>   `.claude/rules/angular.md` for which forms approach actually applies** (Signal
>   Forms for Angular 21+, Reactive Forms for v19/v20) — don't assume either.
> - **Styling**: use the actual selected library's components if one is selected;
>   plain CSS/SCSS if `styling` is `none`.
> - **Tests**: cover initial render, search filtering, and delete — don't skip.
>
> Build this the way you normally would given this project's real `.claude/`
> guardrails — the point is observing how they behave against a real feature.
>
> Once built, run `npx @angular/cli lint`, `npx @angular/cli build`, and
> `npx @angular/cli test --watch=false` yourself and capture the real results.
>
> **Then output a single structured summary** with these exact sections, so it can be
> pasted back into another session verbatim:
> 1. **Files created/changed** (list, in order)
> 2. **Full content of every new/changed file** under `src/app/` — the whole file,
>    not excerpts, each labeled with its path
> 3. **Hook behavior actually observed** — for each hook that fired (blocked or
>    warned), name it, what triggered it, and whether it was a correct block or a
>    false positive. If literally nothing fired, say so explicitly and note whether
>    that's because nothing violated anything, or because you're unsure.
> 4. **Anything that should have been blocked by a hook but wasn't**
> 5. **Rule/`CLAUDE.md` guidance gaps** encountered
> 6. **`ng lint`/`ng build`/`ng test` results**, exact output for any failure
> 7. **Assumptions made** — every judgment call and why

---

## PHASE C — back in this session (the `boilerplate-generator` clone), after the human returns with Phase B's output

### Step 5 — Write the report yourself, fully filled in

Copy `test-reports/TEMPLATE.md` to
`test-reports/tester-<N>-<short-bundle-description>-<unix-timestamp>.md` (timestamp
via `date +%s` — protects against two people accidentally getting the same number).
Fill in every section using Phase B's pasted output directly — paste the full file
contents it gave you into "Generated code" verbatim, don't summarize them again.
Fill in "Assumptions made" from both phases' judgment calls.

### Step 6 — Commit and push the report, then clean up

```bash
cd boilerplate-generator
git add test-reports/tester-<N>-<short-bundle-description>-<timestamp>.md
git commit -m "test-report: tester <N> (<short bundle description>)"
```

**Push with retries** — several people may be pushing around the same time:
```bash
for i in 1 2 3 4 5; do
  git pull --rebase && git push && break
  echo "Push attempt $i failed — retrying..."
  sleep $((RANDOM % 5 + 1))
done
```
If all 5 fail, note it in the report (already committed locally, just not pushed) and
move on — don't ask a question.

```bash
rm -rf /tmp/feature-test-<N>
```

Do not commit anything from `/tmp/feature-test-<N>` itself — only the report. Do not
touch `base/`, `bundles/`, or `scripts/generate.js`, even for a bug you're confident
about — describe it in the report; the central-brain session makes the actual fixes.

### Step 7 — End with a short summary, not a question

Assignment number, pass/fail on lint/build/test, whether the report pushed
successfully. Then stop.
