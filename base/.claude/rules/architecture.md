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

- File name: no type suffix — `user.ts`, not `user.component.ts`.
- Class name: descriptive and typed — `UserProfile`, `UserApiService`, `AuthGuard`.
- Test file: same name + `.spec.ts`, colocated — `user.ts` + `user.spec.ts`.
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
