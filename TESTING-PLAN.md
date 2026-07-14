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

| # | Purpose | Flags |
|---|---|---|
| 1 | **Baseline, true latest Angular** (no `--angular-version` — this is the biggest untested gap in every prior session) | `--auth=none --data-layer=mock --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none --project-name=real-test-1` |
| 2 | **Deepest combination** — stacks the most CLI schematics on top of each other on true latest Angular | `--auth=basic-auth --data-layer=rest --state=signals-only --roles=single-role --deploy-target=ssr --i18n=multi-language --offline=pwa --styling=tailwind --project-name=real-test-2` |
| 3 | **Cross-bundle `requires` positive case** — `rbac` needs a real auth method; confirms the guard/directive integration actually works together | `--auth=oauth-sso --data-layer=graphql --state=signals-only --roles=rbac --deploy-target=spa --i18n=single-language --offline=standard --styling=material --project-name=real-test-3` |
| 4 | **Version-gated bundles on their actual supported version** (v21 — the only version where `ngrx-signalstore` AND `primeng` are both valid) | `--angular-version=21 --auth=basic-auth --data-layer=rest --state=ngrx-signalstore --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=primeng --project-name=real-test-4` |
| 5 | **Legacy version, zoneless correctness** (v19 — different provider API name than v20) | `--angular-version=19 --auth=basic-auth --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none --project-name=real-test-5` |
| 6 | **Legacy version, quote-style + file-naming fixes** (v20 — different `eslint.config.js` format and root component filename than v19/v21) | `--angular-version=20 --auth=basic-auth --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none --selector-prefix=acme --project-name=real-test-6` |
| 7 | **Custom selector prefix on true latest** — exercises the prefix-rename fix on the version it was originally built against | `--selector-prefix=acme` + same simple flags as Test 1, `--project-name=real-test-7` |

### Negative tests — must FAIL cleanly, not generate a broken project

Run these with `--dry-run=true` and confirm: **non-zero exit code, no directory
created, clear error message naming the actual conflict.**

| # | Purpose | Flags | Expected failure |
|---|---|---|---|
| 8 | Cross-bundle `requires` violation | `--roles=rbac --auth=none` (+ any other required flags) | `roles="rbac" requires auth to be one of [...]` |
| 9 | Version floor violation | `--auth=oauth-sso --angular-version=21` (+ others) | `auth="oauth-sso" requires Angular >= 22` |
| 10 | Version ceiling violation | `--styling=primeng` with no `--angular-version` (defaults to 22) | `styling="primeng" requires Angular <= 21` |

## Step 3 — Real GitHub push (never actually tested end-to-end outside a sandbox bare repo)

Create one real empty GitHub repo, then re-run **Test 1's flags** with:
```bash
GITHUB_TOKEN=<a real fine-grained PAT scoped to that repo> \
node scripts/generate.js ...(Test 1's flags)... --repo=https://github.com/<you>/<empty-repo>.git
```
Confirm: real `npm install` succeeds, real `git push` succeeds, and the pushed repo on
GitHub actually contains what's expected (`.claude/`, `CLAUDE.md`, `.mcp.json`, the
right bundle files) — check on github.com itself, not just trust the local commit.

## Step 4 — The skill, used conversationally (never tested outside this write-up)

Inside Claude Code, in the `boilerplate-generator` repo, either type
`/new-angular-project` or just say "I want to create a new Angular project for a
client." Answer its questions with a simple, valid combination. Confirm:
- It asks one question at a time, not all at once.
- It calls `generate.js` itself rather than hand-writing any files.
- It shows `generate.js`'s real output (including any warnings) rather than
  paraphrasing it away.

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
| Real GitHub push | | — | — | — | |
| Skill (conversational) | | — | — | — | |

**Especially flag, since these were sandbox-only findings never confirmed on real
hardware:**
- Did Test 1 actually resolve true Angular 22 (check `package.json`'s
  `@angular/core` version), or did something still auto-resolve an older version?
- Did `ng test` (Karma, v19/v20) actually launch and pass — this sandbox had no Chrome
  binary, so this was never confirmed to actually *run*, only that `ng build` worked.
