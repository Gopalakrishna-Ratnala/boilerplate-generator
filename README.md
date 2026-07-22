# Angular Boilerplate Generator

A script that generates a real, working Angular project — matched to a specific
client's requirements — with company-wide guardrails baked in from the start.

For the plain-English "what is this and how does it work" explainer, see
[`PROJECT-EXPLAINED.md`](./PROJECT-EXPLAINED.md) (or ask for a copy if it's not in
this repo). This README is the quick-start version.

## Quick start

```bash
git clone <this-repo-url>
cd boilerplate-generator

node scripts/generate.js \
  --project-name=my-app \
  --auth=basic-auth \
  --data-layer=rest \
  --state=signals-only \
  --roles=single-role \
  --deploy-target=spa \
  --i18n=single-language \
  --offline=standard \
  --styling=tailwind \
  --e2e=none \
  --out-dir=~/my-app \
  --dry-run=false
```

All 9 middle flags are required — the script refuses to run without one, and
refuses invalid combinations (e.g. `--roles=rbac` without a compatible `--auth`)
with a clear explanation rather than generating something broken.

**For every flag, every valid value, and more example commands**, see
[`GENERATOR-CLI-REFERENCE.md`](./GENERATOR-CLI-REFERENCE.md) if present, or ask for
a copy — it's meant for someone running this without any AI assistance at all.

**If you have Claude Code**, you don't need to remember any of the flags — just say
"create a new Angular project" and the `new-angular-project` skill will ask the
right questions and run the script for you.

## What you get

Every generated project includes:
- A real Angular workspace, scaffolded via Angular's own official CLI
- `CLAUDE.md` + `.claude/rules/` — plain-English conventions for architecture,
  Angular patterns, accessibility, security, and error handling
- `.claude/hooks/` — scripts that actively watch and can block common mistakes in
  real time (hardcoded colors, non-accessible interactive elements, editing
  protected files, dangerous terminal commands, and more) — not just written rules
  hoping to be followed
- Whichever combination of the 9 axes below was selected, fully wired together
- A first Git commit, dependencies installed, pre-commit checks configured

## The 9 choices ("axes") and their current options

| Axis | Options |
|---|---|
| `auth` | none, basic-auth, oauth-sso, auth0, cognito, saml |
| `data-layer` | mock, json-server, rest, graphql, realtime |
| `state` | signals-only, ngrx-signalstore |
| `roles` | single-role, rbac |
| `deploy-target` | spa, ssr |
| `i18n` | single-language, multi-language |
| `offline` | standard, pwa |
| `styling` | none, tailwind, material, primeng |
| `e2e` | none, playwright |

Some combinations are version-gated (e.g. `oauth-sso` needs Angular 22+) or
cross-constrained (e.g. `rbac` needs a compatible `auth` option) — the script
validates all of this before generating anything.

## Repo structure

```
scripts/generate.js       the actual generator script
base/                     what every generated project gets, regardless of choices
bundles/                  the pick-and-choose options, one folder per axis/option
.claude/skills/           conversational helpers for Claude Code users
test-reports/             real test results from actually building features
                          inside generated projects
TESTING-PLAN.md           structured test plan for generation-level correctness
FEATURE-TEST-PLAN.md      structured test plan for real feature-building sessions
CONTEXT.md                internal, session-by-session engineering log — useful
                          if you're continuing this work, not needed to use the
                          generator day to day
```

## Testing this has actually had

This isn't just checked for "does it compile." Real people (and AI agents) have
generated real projects across many different combinations and actually built
features inside them — see `test-reports/` for the real, pasted results. That
process found and fixed several bugs that were invisible to basic lint/build
checks, including a missing piece of HTTP setup that would have broken every real
app using a plain REST backend, and a crash specific to combining login with
server-side rendering. Every fix was verified by regenerating and testing again,
not just reasoned about.

## Contributing a new bundle option

See [`bundles/BUNDLE-CONTRACT.md`](./bundles/BUNDLE-CONTRACT.md) for the exact
folder shape every bundle option must follow.
