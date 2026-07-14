# Architecture & Folder Conventions (Company Standard)

> House rules layered on top of `angular.md` (Angular's own guidance). If the two ever
> seem to conflict, `angular.md` wins for anything about *how Angular APIs work*; this
> file wins for anything about *how we organize a project*.

## Folder structure

```
src/app/
├── core/                 # App-wide singletons only. Guards, interceptors, root services.
│   ├── guards/
│   ├── interceptors/
│   └── services/
├── shared/                # Reusable, presentation-only. No business logic.
│   ├── components/
│   ├── directives/
│   └── pipes/
├── features/               # One folder per domain feature. Lazy-loaded via routes.
│   └── <feature-name>/
│       ├── components/
│       ├── services/
│       ├── models/
│       └── <feature-name>.routes.ts
├── layout/                 # Shell: header, footer, nav, page chrome.
├── app.config.ts
└── app.routes.ts
```

Rules:
- `shared/` components must not import anything from `features/` or `core/services/`
  that has side effects — they should be presentation-only and reusable anywhere.
- `core/` must never import from `features/`.
- Each `features/<name>/` is self-contained: another feature should not deep-import a
  file from inside a different feature's folder. If two features need to share
  something, it belongs in `shared/` (if presentational) or gets promoted to `core/`
  (if it's a singleton service).
- New features are lazy-loaded in `app.routes.ts` using dynamic `import()` /
  `loadComponent()` / `loadChildren()` — never eagerly bundled into the main chunk.

## File & class naming

- File name: traditional type-suffix convention — `auth.guard.ts`, `auth.service.ts`,
  `auth.interceptor.ts`, `has-role.directive.ts`, `user.model.ts`. This matches every
  file this project's boilerplate bundles actually ship (not a stylistic preference —
  it's what's already implemented and tested).
- Class name: matches the file's subject and type — `AuthGuard`, `AuthService`,
  `UserModel`.
- Test file: same name + `.spec.ts`, colocated — `auth.service.ts` + `auth.service.spec.ts`.
- Selector prefix: `{{SELECTOR_PREFIX}}-` on every custom component selector.

## Where new code goes (quick reference for an AI agent)

| Task | Location |
|---|---|
| New page/feature | `features/<feature-name>/` |
| New reusable button/card/modal | `shared/components/` |
| New pipe/directive used across features | `shared/pipes/` or `shared/directives/` |
| New guard | `core/guards/` — only if genuinely app-wide |
| New interceptor | `core/interceptors/` — only if genuinely app-wide |
| New API service for one feature | `features/<feature-name>/services/` |
| New API service used by multiple features | `core/services/` |

If a new file doesn't clearly fit one of these, stop and ask rather than guessing a new
top-level folder.

## Container vs. presentational components

- **Container (a.k.a. "smart") components** live under `features/<name>/pages/` (or
  directly in the feature root if there's no separate `pages/` split) — they own state,
  make API calls (via a service, never `HttpClient` directly — see `data-layer`'s rule
  file), and handle routing. A feature typically has few of these.
- **Presentational (a.k.a. "dumb") components** live under `shared/components/` (if
  reusable across features) or `features/<name>/components/` (if specific to one
  feature) — they take input via `input()`, emit via `output()`, and don't reach out to
  services or hold app state themselves. A feature typically has several of these.
- New UI work defaults to presentational unless it genuinely needs to own state or make
  API calls — most bugs from over-complicated components come from skipping this split
  and building one component that does everything.

## Unsaved-changes / navigation guards

- If a feature has a form or other state a user could lose by navigating away
  accidentally (a multi-step wizard, an edit form with unsaved changes), add a
  `CanDeactivate` functional guard rather than leaving it unprotected — silently losing
  a user's input is a common, avoidable frustration.
- Keep the guard generic and reusable (e.g. a shared `hasUnsavedChanges` guard that
  calls a `canDeactivate(): boolean` method the component implements) rather than
  writing a bespoke one-off guard per feature.
