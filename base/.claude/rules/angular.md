# Angular Conventions (Official Baseline)

> Source: Angular's own official AI/LLM guidance (angular.dev/ai/develop-with-ai,
> best-practices.md). This file is the framework's standard, not a company preference.
> Company-specific conventions live in `architecture.md` and `security.md` instead —
> keep that separation so it's always clear which rule is "Angular says so" vs
> "we say so."

## TypeScript

- Strict type checking is on. Do not weaken `tsconfig` strictness.
- Prefer type inference when the type is obvious from the assignment.
- Avoid `any`. Use `unknown` when the type genuinely isn't known yet, then narrow it.

## Components

- Always standalone. Do **not** write `standalone: true` — it's the default; adding it
  is a signal of outdated-pattern generation.
- Do **not** explicitly set `changeDetection: ChangeDetectionStrategy.OnPush` if the
  project default already makes it implicit — check `app.config.ts` first. If unsure,
  set it explicitly; it's never wrong, just sometimes redundant.
- Use `input()` / `output()` functions, not `@Input()` / `@Output()` decorators.
- Use `inject()` for dependency injection, not constructor-parameter injection.
- Do **not** use `@HostBinding` / `@HostListener` — use the `host` object in the
  `@Component` decorator instead.
- Do **not** use `ngClass` / `ngStyle` — use direct `class` / `style` bindings.
- Use `NgOptimizedImage` for any static image, not a plain `<img>`.
- Prefer small, focused components. Prefer inline templates for genuinely small
  components; use a separate `.html` file once the template exceeds ~15-20 lines.

## Templates

- Use native control flow: `@if`, `@for`, `@switch`. Never `*ngIf` / `*ngFor` /
  `*ngSwitch` — those are deprecated.
- `@for` **must** have a `track` expression.
- Use the `async` pipe for observables in templates rather than manual `subscribe()` +
  local field, unless the component genuinely needs the value outside the template too.
- Keep templates logic-light — non-trivial logic belongs in the component class
  (`computed()`, a plain method), not inline in the template expression.

## State

- Use `signal()` for local/component state.
- Use `computed()` for derived state. Keep the computation pure — no side effects.
- **Never call `.mutate()`.** Use `.set()` or `.update()` so change detection tracks the
  change correctly.
- This project's app-wide state approach (plain signals in services vs. NgRx
  SignalStore) is fixed by the `state` bundle already selected for this project — see
  `.claude/rules/state.md`. Do not introduce a different state pattern for the same
  concern.

## Deferred loading & performance

- Use `@defer` (with an appropriate trigger and `@placeholder`) for heavy,
  below-the-fold, or rarely-used components.
- Lazy-load feature routes — never eagerly import a `features/*` module/component tree
  from the root routes unless there's a specific reason.

## Zoneless

- This project runs zoneless (`provideZonelessChangeDetection()`), configured in
  `app.config.ts`. Do not add `zone.js` back to polyfills or `angular.json`.
- Because of this, don't rely on implicit change detection from timers/promises the way
  a zone-based app might — a signal update or explicit trigger is what causes
  re-render.

## Testing

- Test runner is Vitest. Test files are `*.spec.ts`, colocated with the file they test.
- Use `TestBed` for component/service tests as normal — Vitest's API is Jest-like
  (`describe`/`it`/`expect`).
- Write a test for any new component's key behavior and any new service's public
  methods. Do not skip tests to move faster — the hook running lint/tests will catch
  missing coverage on obvious cases, but don't rely on that as the only bar.

## Forms

- Prefer Reactive Forms over Template-driven forms for anything beyond a single trivial
  input.
- If this project's `data-layer` or a specific feature calls for Signal Forms
  (`@angular/forms/signals`), that will be called out explicitly in the relevant bundle
  rule file — don't introduce it unprompted.
