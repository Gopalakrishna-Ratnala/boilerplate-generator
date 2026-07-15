# Accessibility (Official Angular Guidance)

> Source: Angular's official accessibility guide (angular.dev/best-practices/a11y).
> Kept separate from `angular.md` since this is a focused, high-stakes topic — many
> client projects have accessibility as a compliance requirement, not just a nice-to-have.

## Already enforced automatically — don't duplicate manually

`eslint.config.js` already includes `angular.configs.templateAccessibility` (part of
this project's base ESLint setup). Template-level accessibility issues (missing
`alt` text, invalid ARIA roles, etc.) are caught by `ng lint` automatically. Don't treat
lint passing as the whole job, though — lint catches syntax-level mistakes, not the
structural patterns below.

## What the AI agent must do

- **Every `<input>` needs a real accessible name** — a `<label for="...">`, an
  `aria-label`, or `aria-labelledby`. A `placeholder` attribute alone is **not**
  sufficient (it disappears once the user types, and isn't reliably exposed as the
  field's name to screen readers) — this applies just as much to a search/filter
  input as to a labeled form field, not just the latter.
- **ARIA attributes**: bind them like any other attribute — `[aria-label]="myLabel"` for
  dynamic values, plain `aria-label="Save document"` for static ones. Use property
  binding (not string interpolation) for anything that needs to stay in sync with
  component state.
- **Focus management after route navigation**: when adding new routes/pages, make sure
  focus moves to the new page's main content after navigation — don't leave focus
  wherever it was before navigating, and don't let it silently return to `<body>`. If
  this project doesn't already have a navigation-focus handler (listening for
  `NavigationEnd` and focusing the new page's main heading), flag that as missing rather
  than assuming the browser handles it.
- **Active link indication**: any navigation using `routerLinkActive` for visual
  active-state styling should also set `aria-current` via `RouterLinkActive`'s
  `ariaCurrentWhenActive` input — a visual-only cue doesn't help screen reader users.
- **`@defer` blocks**: since this project may use deferred loading (see `angular.md`),
  wrap `@defer` content that changes significantly after load in an element with an
  appropriate ARIA live region, so screen readers announce the change — don't assume a
  sighted-user-only experience.
- **Reuse native elements** rather than reimplementing their behavior — a custom
  "button-like" div needs all the keyboard/focus/ARIA behavor a real `<button>` gets for
  free. Prefer an attribute selector on a native element (e.g. a custom directive on
  `<button appMyButton>`) over building a div-based lookalike. **This is hook-enforced**
  (`.claude/hooks/check-interactive-div-span.sh`) — a `<div>`/`<span>` with `(click)`,
  `tabindex`, or `(keydown)`/`(keyup)` bound directly on it will be blocked, not just
  flagged in review.
- **For genuinely custom interactive widgets with no native element equivalent**, check
  whether Angular Aria (`@angular/aria`) already provides an accessible primitive before
  hand-rolling ARIA roles/keyboard-navigation logic yourself. Angular Aria's official
  component set (verified against the Angular team's own agent-skills reference)
  covers: **Accordion, Listbox, Combobox, Menu, Tabs, Toolbar, Tree, Grid** — if the
  widget being built matches one of these, use Angular Aria's primitive rather than
  hand-rolling; it exists specifically to avoid every project reinventing this from
  scratch, and gets it right in ways that are easy to get subtly wrong by hand (focus
  trapping, roving tabindex, correct ARIA state updates).

## What the AI agent must NOT do

- Do not add `tabindex` to non-interactive elements to "fix" a lint warning without
  understanding why — adding focusability to something that isn't actually interactive
  creates a worse experience than the original issue.
- Do not disable `angular.configs.templateAccessibility` rules in `eslint.config.js` to
  make a lint error go away — fix the underlying markup instead. This file is not in the
  protected-files list (it may need legitimate edits for other reasons), but silencing
  accessibility rules specifically is not an acceptable fix — flag it if a rule seems
  wrong rather than disabling it.
