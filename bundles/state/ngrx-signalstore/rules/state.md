# State: NgRx SignalStore

## ⚠️ Known compatibility note — read before using

`@ngrx/signals` (pinned in `package.json`) declares a peer dependency on a specific
`@angular/core` major version. This project's locked base stack is "latest stable
Angular," which may be ahead of what `@ngrx/signals` currently supports. **This was a
known, real mismatch at the time this bundle was written — verify both packages'
current peer-dependency ranges before assuming it's resolved.** If still mismatched,
that's a per-project developer decision (documented in `manifest.json`'s `knownIssues`)
— don't silently force an install with `--legacy-peer-deps` without a developer having
made that call.

## What pattern is used

Shared, non-trivial feature state uses `@ngrx/signals`' `signalStore()` — one store per
feature, built from `withState()`, `withComputed()`, and `withMethods()`. State updates
go through `patchState()`, never direct mutation.

## What the AI agent may do

- Create a new store per feature: `src/app/features/<feature>/state/<feature>.store.ts`,
  using `signalStore(withState(...), withComputed(...), withMethods(...))`.
- Use `patchState(store, { ... })` or an updater function inside `withMethods` to change
  state — never assign directly to a state signal.
- Use `withEntities()` (from `@ngrx/signals/entities`) for collection-shaped state
  (lists of records with an ID) instead of hand-rolling array manipulation in
  `withMethods`.
- Inject the feature's own services (e.g. an `ApiService`-based feature service) inside
  `withMethods` via `inject()`, following the same pattern as any other Angular service.
- **`rxMethod()` may not be available** — found via testing that this project's pinned
  `@ngrx/signals` version doesn't ship an `rxjs-interop` subpath export. Check
  `node_modules/@ngrx/signals` directly before assuming `rxMethod()` is available (some
  SignalStore examples online assume it). If it's not there, a plain
  `someService.getData().subscribe(result => patchState(store, { ... }))` call inside
  `withMethods` is a valid, documented-elsewhere fallback pattern — not a workaround to
  be embarrassed about.

## What the AI agent must NOT do

- **Do not mix this pattern with plain signal-service state for the same concern.**
  If a feature already has a SignalStore, don't also create a separate `signal()`-based
  service holding overlapping state.
- **Do not mutate state outside `patchState()`** — e.g. don't reach into
  `store.someArray().push(...)`. Always go through `patchState` or a method defined in
  `withMethods`.
- Do not add classic NgRx (`@ngrx/store`, actions/reducers/effects) alongside this —
  this project's state bundle selection is SignalStore specifically, not classic NgRx.
  If a task seems to need actions/effects-style architecture, that's a bundle-selection
  question for a developer.
- Do not introduce `@ngrx/signals` version changes or attempt to resolve the
  Angular-version peer-dependency mismatch yourself (e.g. by editing `package.json`
  directly) — flag it instead.

## Where the code lives

- `src/app/features/<feature-name>/state/<feature-name>.store.ts` — one SignalStore per
  feature that needs this level of structure. Not every feature needs one — plain
  signal services (see the `signals-only` pattern) remain fine for genuinely simple
  feature state even in a project that has this bundle selected for its *more complex*
  features.
