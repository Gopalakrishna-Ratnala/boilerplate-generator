# Feature Test Report — Tester 2

**Bundle combination tested:**
`--auth=oauth-sso --data-layer=graphql --state=signals-only --roles=rbac --deploy-target=spa --i18n=single-language --offline=standard --styling=material`

**Angular version:** Latest requested (assignment says omit version flag → latest). Attempted fallback to Angular 21 per skill instructions (Node v20.19.0 < v22 minimum of >=22.22.3). Generation failed — see below.

**Your Node version:** v20.19.0

**Date:** 2026-07-15

---

## Generation

- [ ] `generate.js` completed without error
- [ ] `npm install` succeeded

**Generation failed — hard stop.**

### Exact error

Attempt 1: `--angular-version=21` (v22 not possible on Node v20.19.0):

```
🔎 Checking prerequisites...
   ✓ node, npm, git, jq all found.

🔎 Validating bundle selection...
   ✓ All cross-bundle "requires" checks passed.
   ✗ auth="oauth-sso" requires Angular >= 22, but target is Angular 21.

❌ Invalid bundle/Angular-version combination (see above). Refusing to generate a repo
whose dependencies cannot actually install. Pick a different bundle option or a
different --angular-version.
```

Per the skill's fallback instructions, lower Angular versions (v20, v19) were not attempted because the `auth="oauth-sso"` bundle-version constraint (`requires Angular >= 22`) would produce the same validation failure for any version below 22. The constraint is on the bundle, not on Node — trying v20 or v19 would fail identically. The only version that would satisfy `oauth-sso` is v22+, which is unreachable on Node v20.19.0 (minimum: >=22.22.3).

This is a genuine unrecoverable failure: the specific combination of this machine's Node version and this tester's assigned bundle set cannot be generated.

---

## The feature-building session

Not reached — generation failed.

---

## Generated code — the most important section, do not skip or summarize

No code was generated.

---

## Rule compliance self-check

Not applicable.

---

## Hook behavior observed

None — generation never completed.

---

## Anything that should have been blocked, but wasn't

Not applicable.

---

## Rule/CLAUDE.md guidance gaps

**The generator correctly caught this incompatibility** — `generate.js` validates bundle/version constraints before doing anything. The error message is clear and immediately actionable.

However, this exposes a real test-design gap:
- Assignment #2's `oauth-sso` bundle requires Angular ≥ 22.
- Angular 22 requires Node ≥ 22.22.3.
- The skill's fallback logic ("try next-lowest Angular version") doesn't help when the bundle itself hard-requires the version you can't reach.

If this test environment's Node version is known to be v20.19.0, Assignment #2 is simply unrunnable on this machine. The FEATURE-TEST-PLAN.md or the parallel-testing coordinator should cross-check `auth="oauth-sso"` assignments against testers' Node versions before handing out assignments. Alternatively, the assignment table in the skill should flag which assignments require Node >=22.

---

## Final verification

| Check | Result |
|---|---|
| `ng lint` | NOT RUN — generation failed |
| `ng build` | NOT RUN — generation failed |
| `ng test` | NOT RUN — generation failed |

---

## Assumptions made

1. **Fallback logic stops at v19 per spec, but bundle constraint applies at all versions**: `oauth-sso` requires Angular ≥ 22 regardless of which fallback version is tried. Attempting v20 and v19 would waste time and produce the same `✗ auth="oauth-sso" requires Angular >= 22` error. Chose not to make those attempts and documented why.

2. **Did not try generating with a different auth bundle**: The skill instructions say "don't try to work around a genuine generator failure yourself." Swapping `oauth-sso` for a compatible auth bundle would be a different assignment, not a workaround.

---

## Anything else worth flagging

- **Node upgrade is the real fix**: Upgrading the test machine to Node >=22.22.3 would allow all 6 assignments to run. This is the same recommendation from the tester 1 report (which noted Angular 22 was unverifiable for the same reason). This is now confirmed twice.
- **Generator validation is working correctly**: The `generate.js` validator caught the incompatibility cleanly and gave a clear error. No false pass, no silent bad state. This is the guardrail system doing exactly what it should.
- **Report pushed as early-stop documentation**: Per skill instructions, even a failure gets committed and pushed so the coordinating session knows what happened.
