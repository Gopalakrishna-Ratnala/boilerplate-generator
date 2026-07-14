# Styling: Angular Material

## What pattern is used

This project uses Angular Material, added through its own official CLI schematic
(`ng add @angular/material`), not hand-configured — this wires theming (Material 3's
`mat.theme()` mixin), typography, and the CDK automatically, matched to whatever
Angular version this project actually uses. The theme configuration lives inline in
`src/styles.scss` (the schematic's own default location — there is no separate
dedicated theme file to isolate/protect, unlike this project's other config-driven
bundles).

## What the AI agent may do

- Use real Material components/directives (`mat-button`, `mat-form-field`, `mat-card`,
  etc.) for anything a Material component covers — don't restyle a raw `<button>` or
  `<div>` to visually mimic one.
- Adjust the theme's color palette / typography / density in `styles.scss`'s
  `mat.theme(...)` block if a developer has approved a specific palette change — this
  is the one legitimate place to change Material's look centrally.
- Use Angular CDK (already installed as a Material dependency) directly for anything
  needing accessible primitives without a full Material component (e.g. `cdk-overlay`,
  `FocusTrap`).

## What the AI agent must NOT do

- **Do not override Material's internal DOM structure/CSS classes directly**
  (`.mat-mdc-*` selectors) to achieve a visual change — this breaks on any Material
  version upgrade and bypasses the theming system entirely. Use the theming API
  (`mat.theme()`, CSS custom properties Material exposes) instead.
- Do not scatter ad hoc CSS overrides for Material components across feature files —
  theme changes belong centrally in `styles.scss`'s theme block, not spread across the
  codebase.
- Do not add a second component library (PrimeNG, a custom Tailwind setup) alongside
  Material.

## Known limitation (be aware, not something to fix yourself)

Unlike this project's other bundles, the Material theme configuration has no dedicated,
hook-protected file — `ng add @angular/material` puts it directly inside
`src/styles.scss`, a file that also holds other legitimate global styles. This means
theme changes aren't machine-blocked the way, say, `oauth.config.ts` is — rely on this
rule file's guidance rather than assuming a hook will catch a misplaced theme edit.

## Where the code lives

- `src/styles.scss` — theme configuration (`@include mat.theme(...)`), alongside other
  global styles.
