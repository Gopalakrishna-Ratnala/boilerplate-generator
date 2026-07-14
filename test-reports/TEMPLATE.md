# Feature Test Report — Tester <N>

**Bundle combination tested:** (paste your exact flags here)
**Angular version:** (target requested, and actual version if you had to substitute)
**Your Node version:**
**Date:**

## Generation

- [ ] `generate.js` completed without error
- [ ] `npm install` succeeded (note any warnings/vulnerabilities if relevant)

## The feature-building session

Paste or summarize what Claude Code actually did, briefly — not a full transcript,
just enough that someone reading this later understands the shape of what happened
(what files it created/touched, roughly in what order, anything it asked you).

## Hook behavior observed

Fill in one row per hook that actually fired (blocked or warned) during the session.
Leave blank / write "none fired" if nothing did.

| Hook | What triggered it | Correct block, or false positive? | Notes |
|---|---|---|---|
| | | | |

## Anything that should have been blocked, but wasn't

Describe any case where Claude Code did something this project's rules explicitly
prohibit, but no hook caught it. Be specific — quote the actual code/pattern if you
can.

## Rule/CLAUDE.md guidance gaps

Anywhere the written rules were unclear, missing, or contradicted what actually made
sense for this bundle combination. Include what Claude Code did instead (guessed,
asked you, picked something inconsistent with docs).

## Final verification

| Check | Result |
|---|---|
| `ng lint` | |
| `ng build` | |
| `ng test` | |

## Anything else worth flagging

Free-form — anything that doesn't fit above but seems worth the central brain
session knowing about.
