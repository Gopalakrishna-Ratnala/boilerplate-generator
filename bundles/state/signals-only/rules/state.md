# State: Signals Only

## What pattern is used

This project has no state management library. All state — local to a component or
shared across a few related components/features — is held in `signal()`s inside plain
Angular services, following Angular's own official guidance in
`.claude/rules/angular.md`.

## What the AI agent may do

- Create a new state service per feature (or per closely-related group of components)
  named `<feature-name>.state.ts`, e.g. `cart.state.ts`, exposing `signal()`s and
  `computed()`s as its public API.
- Scope a state service with `providedIn: 'root'` only if the state genuinely needs to
  be shared across multiple features; otherwise provide it at the feature/component
  level (in the feature's routes or a parent component's `providers`) so its lifetime is
  scoped to where it's actually used.
- Expose state as **read-only** to consumers — e.g. return `computed()` values or the
  signal itself for reading, and put mutation behind named methods (`addItem()`,
  `clear()`) rather than exposing a raw settable signal for callers to `.set()` directly
  from anywhere.

## What the AI agent must NOT do

- **Do not add a state management library** (NgRx, NgXs, Elf, Akita, etc.). This
  project's state bundle selection was `signals-only` — if a task feels like it needs
  more structure than plain signals give you, that's a sign to flag it to a developer
  for a bundle-selection reconsideration, not to reach for a library unprompted.
- Do not put app-wide state in a component — state meant to outlive/be shared beyond one
  component's lifecycle belongs in a service.
- Do not expose a raw mutable signal as public API of a state service (e.g.
  `readonly count = signal(0)` with no `.asReadonly()` and no wrapper methods) — callers
  outside the service could then mutate state directly, bypassing whatever invariants
  the service is meant to enforce. Use `.asReadonly()` or expose only `computed()`.

## Where the code lives

- `src/app/core/services/` — any state genuinely shared app-wide (rare in this pattern).
- `src/app/features/<feature-name>/services/<feature-name>.state.ts` — the normal case,
  one state service per feature.
