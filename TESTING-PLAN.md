# Generator Test Plan — Real-Machine Verification

> Purpose: verify everything built and sandbox-tested in `CONTEXT.md` actually works on
> a real machine with the correct Node version and real network access — the two
> things the sandbox couldn't fully provide. Designed for **minimum iterations, maximum
> coverage**: every bundle option is touched at least once, both directions of
> version-gating are checked, and the specific bugs found/fixed in earlier sessions are
> re-verified on real hardware, not just re-trusted.

**How to use this file:** paste the prompt at the bottom into Claude Code, run from
inside the `boilerplate-generator` repo root. Claude Code should work through every
test below, capture the real output, and fill in the report table at the end — don't
let it skip a test or mark something "pass" without actually seeing the command's real
output.

---

## Step 0 — Prerequisites (must pass before anything else)

```bash
node --version    # need v22.22.3+, v24.15+, or v26+ for true latest Angular (22)
npm --version
git --version
jq --version
```

If Node doesn't meet the minimum, note it — Test 1 (default/latest) will fail or
silently resolve an older Angular version, and that's the #1 thing this whole plan
exists to finally confirm one way or the other.

## Step 1 — Pull latest and sanity-check the repo itself

```bash
git pull
find . -name "*.json" -not -path "./.git/*" -exec sh -c 'jq empty "$1" || echo "INVALID: $1"' _ {} \;
node --check scripts/generate.js && echo "generate.js syntax OK"
```

---

## Step 2 — The test matrix

Run each as a **separate** `node scripts/generate.js` call with `--dry-run=false`,
into a fresh `--out-dir` each time (e.g. `/tmp/real-test-N`). After each successful
generation, `cd` into the generated project and run, in order:
```bash
npx @angular/cli lint
npx @angular/cli build
npx @angular/cli test --watch=false
```
Record the exact pass/fail for **each of the three**, not just whether generation
itself completed — a project can generate fine and still fail lint/build/test, and
that distinction is the whole point of this plan.

**Tests 5 and 6 specifically: `ng test` is the whole point, not optional.** A real bug
(`NG0908: this configuration requires Zone.js`) was found here in session 20 and has
since been fixed in the generator (`enableZonelessForLegacyVersion()` now also patches
the spec file). This sandbox has never had a Chrome binary to actually run Karma, so
the fix has only been confirmed via `ng lint`/`ng build`, never a real `npm test` run.
**Do not skip or shortcut `ng test` for these two — capture its actual pass/fail
output, including the full error if it still fails.**

| # | Purpose | Flags |
|---|---|---|
| 1 | **Baseline, true latest Angular** (no `--angular-version` — this is the biggest untested gap in every prior session) | `--auth=none --data-layer=mock --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none --project-name=real-test-1` |
| 2 | **Deepest combination** — stacks the most CLI schematics on top of each other on true latest Angular | `--auth=basic-auth --data-layer=rest --state=signals-only --roles=single-role --deploy-target=ssr --i18n=multi-language --offline=pwa --styling=tailwind --project-name=real-test-2` |
| 3 | **Cross-bundle `requires` positive case** — `rbac` needs a real auth method; confirms the guard/directive integration actually works together | `--auth=oauth-sso --data-layer=graphql --state=signals-only --roles=rbac --deploy-target=spa --i18n=single-language --offline=standard --styling=material --project-name=real-test-3` |
| 4 | **Version-gated bundles on their actual supported version** (v21 — the only version where `ngrx-signalstore` AND `primeng` are both valid) | `--angular-version=21 --auth=basic-auth --data-layer=rest --state=ngrx-signalstore --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=primeng --project-name=real-test-4` |
| 5 | **Legacy version, zoneless correctness + NG0908 fix re-confirmation** (v19 — different provider API name than v20; **a real bug was found and fixed here in session 20 — `npm test` must actually be run and pass, not just build**) | `--angular-version=19 --auth=basic-auth --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none --project-name=real-test-5` |
| 6 | **Legacy version, quote-style + file-naming fixes + NG0908 fix re-confirmation** (v20 — different `eslint.config.js` format and root component filename than v19/v21; **same NG0908 fix applies here too, must be re-confirmed independently, not assumed from Test 5**) | `--angular-version=20 --auth=basic-auth --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none --selector-prefix=acme --project-name=real-test-6` |
| 7 | **Custom selector prefix on true latest** — exercises the prefix-rename fix on the version it was originally built against | `--selector-prefix=acme` + same simple flags as Test 1, `--project-name=real-test-7` |

### Negative tests — must FAIL cleanly, not generate a broken project

Run these with `--dry-run=true` and confirm: **non-zero exit code, no directory
created, clear error message naming the actual conflict.**

| # | Purpose | Flags | Expected failure |
|---|---|---|---|
| 8 | Cross-bundle `requires` violation | `--roles=rbac --auth=none` (+ any other required flags) | `roles="rbac" requires auth to be one of [...]` |
| 9 | Version floor violation | `--auth=oauth-sso --angular-version=21` (+ others) | `auth="oauth-sso" requires Angular >= 22` |
| 10 | Version ceiling violation | `--styling=primeng` with no `--angular-version` (defaults to 22) | `styling="primeng" requires Angular <= 21` |
| 11 | Version ceiling violation, different bundle (broader coverage than Test 10 alone) | `--state=ngrx-signalstore --angular-version=19` | `state="ngrx-signalstore" requires Angular >= 21` |

## Step 3 — Cleanup (local-only testing, no GitHub push for now)

Every test in Step 2 should be run **without** `--repo` (local generation only — no
`GITHUB_TOKEN` needed, nothing pushed anywhere). Once a test's `lint`/`build`/`test`
results are recorded in the final report table, **delete that test's output directory
before moving to the next test**, so nothing lingers on disk:

```bash
rm -rf /tmp/real-test-1   # after recording its results, before starting test 2
```

Do this after every generation test (1–7), immediately after its results are captured
— don't batch the cleanup at the very end, and don't leave any of these directories
around once the whole plan is finished. (The real GitHub push path is skipped for now
and will be tested in a separate, later pass.)

## Step 4 — The skill, used conversationally (never tested outside this write-up)

Run this as **two separate conversations** — the skill gained a new question (session
19) that specifically needs its own check, not just a pass-through of the happy path.

**4a — Straightforward path.** Inside Claude Code, in the `boilerplate-generator`
repo, either type `/new-angular-project` or just say "I want to create a new Angular
project for a client." Confirm:
- **It now asks about target Angular version as its own question (Step 2 in
  `SKILL.md`), before the 8 axis questions** — this was added in session 19 and has
  never actually been exercised conversationally. If it doesn't ask this, or asks it
  in the wrong order (after the axis questions instead of before), that's a real
  regression to report.
- Say "latest" / accept the default when asked — confirm it then omits
  `--angular-version` entirely from the `generate.js` call (doesn't pass some default
  value explicitly).
- It asks the remaining questions one at a time, not all at once.
- It calls `generate.js` itself rather than hand-writing any files.
- It shows `generate.js`'s real output (including any warnings) rather than
  paraphrasing it away.
- **When it asks for a GitHub repo URL, say you don't want to push yet** — generate
  locally only for this pass. Confirm it correctly omits `--repo` and skips the push
  step.

**4b — Version/axis conflict path, specifically testing the new conversational
guard.** Start a fresh conversation with the skill. When asked for target Angular
version, say **"20."** Continue through the axis questions, and when asked about
state management (Q3), deliberately answer in a way that implies you want
`ngrx-signalstore` (e.g. "shared/complex state, use NgRx SignalStore" if asked
directly, or otherwise steer toward it). Confirm:
- **The skill catches this conversationally and tells you it's incompatible with
  Angular 20** (per the table in `SKILL.md`'s Step 2), rather than silently accepting
  the answer and only failing later when `generate.js` itself refuses.
- It asks you to either pick a different state option or reconsider the Angular
  version — doesn't just silently pick one for you.

Delete each test's output directory once confirmed, same as every other test.

---

## Final report — fill in after running everything above

| Test | Generated OK? | `ng lint` | `ng build` | `ng test` | Notes / anything unexpected |
|---|---|---|---|---|---|
| 1 (baseline, true v22) | | | | | |
| 2 (deepest combo) | | | | | |
| 3 (rbac + oauth-sso) | | | | | |
| 4 (v21, ngrx+primeng) | | | | | |
| 5 (v19, zoneless) | | | | | |
| 6 (v20, quote-fix) | | | | | |
| 7 (custom prefix) | | | | | |
| 8 (requires violation) | refused? | — | — | — | |
| 9 (version floor violation) | refused? | — | — | — | |
| 10 (version ceiling violation) | refused? | — | — | — | |
| 11 (version ceiling violation, 2nd bundle) | refused? | — | — | — | |
| Skill 4a (straightforward + version question) | | — | — | — | |
| Skill 4b (version/axis conflict caught conversationally) | — | — | — | — | |

**Especially flag:**
- Did Test 1 actually resolve true Angular 22 (check `package.json`'s
  `@angular/core` version), or did something still auto-resolve an older version? —
  still never confirmed on real hardware as of this version of the plan.
- **Tests 5 and 6: did `ng test` actually launch and pass** (the `NG0908` fix from
  session 20) — this is the single most important result in this entire run. If it
  still fails, capture the full error output, not just "still fails."
- Skill 4b: did the skill actually catch the version/axis conflict before calling
  `generate.js`, or did it only get caught by `generate.js`'s own validation (still
  correct behavior, but worth knowing which layer caught it)?
