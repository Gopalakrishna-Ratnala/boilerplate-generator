# Offline: PWA / Service Worker

## What pattern is used

This project is installable and offline-capable via Angular's own service worker
support (`@angular/service-worker`), added through its official CLI schematic
(`ng add @angular/pwa`) — not hand-written. `ngsw-config.json` controls what gets
cached and how; `public/manifest.webmanifest` controls install/app-icon behavior.

## What the AI agent may do

- Update `public/manifest.webmanifest` for branding changes (app name, theme color,
  icons) — this is not protected.
- Replace the icon files under `public/icons/` with the project's real branding.
- Read `ngsw-config.json` to understand what's cached when debugging a "why am I seeing
  stale content" report — a very common real symptom of service-worker caching, not
  necessarily a bug elsewhere.

## What the AI agent must NOT do

- **Do not edit `ngsw-config.json`** — protected by `.claude/settings.json`. Unlike
  routinely-extended config files elsewhere in this project, getting a caching strategy
  wrong here causes a specific, hard-to-diagnose production bug class: real users
  silently seeing stale cached content with no visible error. If a new asset group or
  API caching rule genuinely seems needed, flag it for a developer to add deliberately
  — this isn't a file to modify based on a best guess.
- Do not remove or disable the `provideServiceWorker(...)` entry in `app.config.ts`.
- Do not assume the service worker is active in development — it's intentionally
  disabled outside of production builds (`enabled: !isDevMode()`), so "it's not working"
  during `ng serve` is expected, not a bug to chase.

## Where the code lives

- `ngsw-config.json` (project root) — caching strategy (protected).
- `public/manifest.webmanifest` — app metadata for installability (editable).
- `public/icons/` — app icons at various sizes (editable — replace with real branding).
- `src/app/app.config.ts` — already wired with `provideServiceWorker(...)` by the
  schematic; file remains generally editable for unrelated app wiring.
