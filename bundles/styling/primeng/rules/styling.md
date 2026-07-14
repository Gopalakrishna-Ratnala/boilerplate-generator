# Styling: PrimeNG

## ⚠️ Known compatibility note — read before using

`primeng`'s peer dependency may lag behind this project's locked "latest stable
Angular" constant — this was a real, verified mismatch at the time this bundle was
written (see `manifest.json`'s `knownIssues`). Verify current peer-dependency ranges
before assuming it's resolved; if still mismatched, that's a developer decision, not
something to silently work around with `--legacy-peer-deps`.

## What pattern is used

This project uses PrimeNG with the Aura theme preset. Unlike Angular Material, PrimeNG
has no official `ng add` schematic — it's a manual install (`primeng`,
`@primeuix/themes`, `@angular/animations`). The theme preset is isolated in
`core/config/primeng-theme.config.ts` (protected) rather than inline in `app.config.ts`.

**Manual wiring required**: `app.config.ts` needs `providePrimeNG({ theme:
primeNgThemeConfig })` and `provideAnimationsAsync()` added to its `providers` array —
this bundle does not auto-wire it the way a real CLI schematic (like Material's) would,
since there's no schematic to run. If a fresh project's `app.config.ts` doesn't have
these yet, add them before using any PrimeNG component.

## What the AI agent may do

- Import PrimeNG components **individually** (e.g. `import { Button } from
  'primeng/button'`), never the entire module surface — this matters for bundle size.
- Use PrimeNG's `Table`/`TreeTable` components for any data-grid need — don't hand-build
  a custom sortable/filterable table when PrimeNG already covers it.
- Use `definePreset()` to customize the Aura preset's design tokens if a developer has
  approved a specific palette — do this inside `primeng-theme.config.ts`'s protected
  scope conceptually, but since that file is protected, flag the need for a developer to
  make the change rather than editing it yourself.

## What the AI agent must NOT do

- **Do not edit** `core/config/primeng-theme.config.ts` — protected by
  `.claude/settings.json`.
- Do not import PrimeNG's full module (an anti-pattern for bundle size) when only a
  handful of components are actually used.
- Do not add a second component library (Material, a custom Tailwind setup) alongside
  PrimeNG.
- Do not override PrimeNG's internal component CSS classes directly — use the design
  token / `definePreset()` system instead.

## Where the code lives

- `src/app/core/config/primeng-theme.config.ts` — theme preset (protected).
- `src/app/app.config.ts` — needs `providePrimeNG(...)` and `provideAnimationsAsync()`
  added manually (see "Manual wiring required" above) — this file itself stays
  generally editable.
