# Styling: Custom / Tailwind

## What pattern is used

This project uses Tailwind CSS (added via `ng add tailwindcss`, the real Angular CLI
integration — not hand-configured) for utility-first styling, with no pre-built
component library. Angular CDK is installed alongside it specifically so custom
interactive widgets can be built accessibly.

**Tailwind v4 uses CSS-first configuration** — there is no `tailwind.config.js`.
Design tokens (colors, spacing, fonts) are defined via the `@theme` directive directly
in `src/tailwind.css`, e.g.:
```css
@import 'tailwindcss';
@theme {
  --color-brand: oklch(0.62 0.19 256);
  --spacing-gutter: 2.5rem;
}
```
Each token automatically generates matching utility classes (`bg-brand`,
`text-brand`, etc.).

## What the AI agent may do

- Use Tailwind utility classes directly in templates as normal.
- Add new design tokens to the `@theme` block in `src/tailwind.css` when a genuinely
  new, reusable value is needed (not a one-off).
- Use Angular CDK directly for any custom interactive widget's behavior — `cdk-overlay`
  for positioning, `FocusTrap`/`FocusMonitor` for focus management, `LiveAnnouncer` for
  screen-reader announcements, the CDK a11y module generally.

## What the AI agent must NOT do — mandatory, not a suggestion

- **Every custom interactive widget (dropdown, combobox, modal, tabs, accordion) MUST
  use Angular CDK underneath for keyboard handling and ARIA roles.** Tailwind provides
  *styling only* — it has no concept of keyboard navigation or ARIA semantics. A
  dropdown built with Tailwind classes and a `(click)` handler but no CDK overlay/focus
  management underneath it is exactly the accessibility anti-pattern this project's
  `accessibility.md` and `check-interactive-div-span.sh` hook exist to prevent —
  applies doubly here since there's no component library providing this for free.
- **Never inline arbitrary hex/rgb/hsl color values in a template's `class` attribute
  or a component's styles** — use a `@theme`-defined token instead. This is already
  hook-enforced project-wide (`check-hardcoded-colors.sh`), not unique to this bundle,
  but especially relevant here since there's no design system doing this automatically.
- **Never use a raw Tailwind palette utility class** (`bg-blue-500`, `text-red-600`,
  `from-purple-400`, etc.) **— use a semantic, `@theme`-defined class instead**
  (`bg-primary`, `text-danger`). This is a *different* check from the hex/rgb/hsl rule
  above — a raw utility class isn't a literal color value, but it's still a color
  choice made directly in markup instead of routed through this project's design
  tokens, which is exactly what "styling gated through design tokens" means. Also
  hook-enforced (`check-raw-tailwind-utility.sh`), not just a style preference.
- Do not add a component library (Material, PrimeNG) alongside this — this project's
  styling bundle selection is custom/Tailwind.
- Do not create a `tailwind.config.js` — that's the v3 pattern; this project uses v4's
  CSS-first `@theme` configuration. If you see instructions or examples referencing
  `tailwind.config.js`, they're for an older Tailwind version — don't follow them here.

## Where the code lives

- `src/tailwind.css` — Tailwind import + `@theme` design tokens.
- `.postcssrc.json` — PostCSS plugin config (created by `ng add`, not something to hand-edit).
