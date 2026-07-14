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
(what files it created/touched, roughly in what order).

---

## Generated code — the most important section, do not skip or summarize

**Why this matters:** a self-assessment of "this follows the rules" is not sufficient
on its own — the central-brain session needs to independently verify compliance
against the real rule files by reading the actual code, not by trusting a summary. An
agent auditing its own work can miss its own subtle violations.

Paste the **full content** of every new or meaningfully-changed file under `src/app/`
(the feature component(s), any new service/state/model file, the updated routes file)
below, one fenced code block per file, each clearly labeled with its path:

```
### src/app/features/products/... (label each file path exactly like this)

<paste full file content here>
```

---

## Rule compliance self-check

Go through this list against the code you just pasted above. Check what's actually
true, don't assume — this is a starting point for the central-brain review, not a
replacement for it.

**Architecture (`architecture.md`)**
- [ ] New feature lives under `features/products/`, not scattered elsewhere
- [ ] Container/presentational split followed where it made sense (not one giant
      component doing everything)
- [ ] No `HttpClient` injected directly in a component (goes through a service)

**Angular patterns (`angular.md`)**
- [ ] `@for` has `track`
- [ ] No `@Input()`/`@Output()` decorators mixed with `input()`/`output()` signals in
      the same file
- [ ] State updates are immutable (`.update(list => [...])`, not `.push()`)
- [ ] No non-trivial method calls directly in template expressions
- [ ] Forms use Reactive Forms + built-in validators, not template-driven forms

**Accessibility (`accessibility.md`)**
- [ ] No `<div>`/`<span>` given `(click)`/`tabindex` instead of a real `<button>`
- [ ] If a custom interactive widget was built (not using a UI library), it uses
      Angular CDK underneath, not hand-rolled keyboard/ARIA logic

**Security (`security.md`)**
- [ ] No hardcoded API URLs in a service (uses the project's config indirection)
- [ ] No `DomSanitizer.bypassSecurityTrust*` calls
- [ ] No secrets/keys hardcoded anywhere

**Styling (only if this project's `styling` bundle isn't `none`)**
- [ ] Used the selected library's actual components, not a fake lookalike
- [ ] No hardcoded hex/rgb/hsl colors outside a central token definition

**Testing**
- [ ] Every new component/service has a co-located `.spec.ts`
- [ ] Tests actually assert real behavior (render, search filtering, delete), not just
      "component created"

## Hook behavior observed

Fill in one row per hook that actually fired (blocked or warned) during the session.
Leave blank / write "none fired" if nothing did.

| Hook | What triggered it | Correct block, or false positive? | Notes |
|---|---|---|---|
| | | | |

## Anything that should have been blocked, but wasn't

Describe any case where the code (per your self-check above) violates a rule but no
hook caught it. Be specific — quote the actual code/pattern.

## Rule/CLAUDE.md guidance gaps

Anywhere the written rules were unclear, missing, or contradicted what actually made
sense for this bundle combination. Include what was done instead (guessed, picked
something inconsistent with docs).

## Final verification

| Check | Result |
|---|---|
| `ng lint` | |
| `ng build` | |
| `ng test` | |

## Assumptions made

If this ran via the `run-feature-test` skill (autonomous, no questions asked), list
every judgment call it made where something was ambiguous — what it chose and why.
Write "N/A, ran interactively" if a human worked through this and decided things live
instead.

## Anything else worth flagging

Free-form — anything that doesn't fit above but seems worth the central-brain session
knowing about.
