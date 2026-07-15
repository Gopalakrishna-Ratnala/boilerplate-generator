# Styling: None (Plain CSS/SCSS)

## What pattern is used

This project has no component library. All styling is plain SCSS, written per-component
(`*.scss` files colocated with each component). There is no design-token system beyond
whatever CSS custom properties the project defines itself.

## What the AI agent may do

- Write plain SCSS as normal, scoped to the component.
- Define CSS custom properties (`--color-primary`, etc.) in a central place (e.g.
  `src/styles.scss`) for any value reused across components — see
  `.claude/hooks/check-hardcoded-colors.sh`, which already enforces not scattering
  literal color values across component styles regardless of which styling option is
  selected.
- **A fresh `styling: none` project has no pre-existing token file to follow** — if
  `src/styles.scss` doesn't already have a `:root { --color-...: ...; }` block, add
  one the first time a feature needs a color, rather than reaching for a literal hex
  value because no example exists yet:
  ```scss
  :root {
    --color-primary: #2563eb;
    --color-danger: #dc2626;
    --color-border: #d1d5db;
    --color-muted: #6b7280;
  }
  ```
  Then reference these via `var(--color-primary)` etc. in component styles — this is
  hook-enforced (`check-hardcoded-colors.sh` exempts the `:root` definition lines
  themselves but blocks any other literal color value), not just a suggestion.

## What the AI agent must NOT do

- Do not add a component library (Material, PrimeNG, etc.) — this project's styling
  bundle selection is `none`. If a real need for prebuilt components emerges, that's a
  bundle-selection change for a developer to make, not something to add mid-task.
- **If building any custom interactive widget** (dropdown, modal, tabs, combobox) —
  even without a component library, this still needs proper keyboard/focus/ARIA
  behavior. Add `@angular/cdk` explicitly for this (it has no dependency on Material)
  rather than hand-rolling ARIA/keyboard logic — flag the need for a developer to add
  it rather than skipping accessibility because no library is selected.

## Where the code lives

N/A — no component-library-specific code in this project by design.
