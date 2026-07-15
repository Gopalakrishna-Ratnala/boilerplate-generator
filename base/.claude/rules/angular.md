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
- **Never call a method directly in a template expression for anything beyond a
  trivial, side-effect-free one-liner** — `{{ calculateTotal() }}` re-runs on every
  change-detection cycle, not just when its inputs change. Use `computed()` for
  anything derived from state; a plain method call in a template is only fine for
  something genuinely cheap and stable (e.g. `{{ formatLabel(item) }}` where
  `formatLabel` is a pure, trivial format helper) — if it does real work, it belongs in
  a `computed()`.
- **Name event handlers for what they do, not the event that triggers them** — per
  Angular's own style guide, `commitNotes()` reads better than `onKeydown()`. Reserve a
  generic name like `handleKeydown()` only for genuinely complex cases that delegate to
  several more specific handlers based on event details.
- **Use Angular's key-event modifiers** (`(keydown.control.enter)`,
  `(keydown.shift.tab)`) instead of hand-checking `event.key`/`event.ctrlKey` in the
  handler body — clearer in the template, less error-prone in the code.

## State

- Use `signal()` for local/component state.
- Use `computed()` for derived state. Keep the computation pure — no side effects.
- **`linkedSignal()`** (stable since Angular 20) — use this instead of `computed()` when
  you need a *writable* signal that resets/derives from another signal, but can also be
  manually overridden. Classic case: a "selected option" that defaults to the first
  item in a list, resets when the list changes, but can be changed by the user in the
  meantime. `computed()` can't do this (it's read-only) — don't reach for a manual
  `signal()` + `effect()` combination to fake this pattern when `linkedSignal()` already
  exists for exactly this case.
- **`resource()` / `httpResource()` / `rxResource()`** — Angular's signal-based
  primitives for async data (most commonly server data-fetching). **These remain
  explicitly experimental as of this writing** (verified against angular.dev) — don't
  treat them as equivalent in stability to `signal()`/`computed()`/`linkedSignal()`. This
  project's `data-layer` bundle already has an established, stable pattern (see
  `.claude/rules/data-layer.md`) — don't introduce `resource()` as a replacement for
  that pattern without a developer decision to do so; it's mentioned here so you
  recognize it and don't reinvent it in an ad hoc way if a specific case seems to call
  for it, not as a default to reach for.
- **Never call `.mutate()`.** Use `.set()` or `.update()` so change detection tracks the
  change correctly.
- This project's app-wide state approach (plain signals in services vs. NgRx
  SignalStore) is fixed by the `state` bundle already selected for this project — see
  `.claude/rules/state.md`. Do not introduce a different state pattern for the same
  concern.
- **Update arrays/objects immutably.** `items.update(list => [...list, newItem])`, not
  `items().push(newItem)` — mutating the underlying array/object in place doesn't
  reliably trigger change detection with signals and makes state changes harder to
  reason about/debug. The same applies to any plain array/object held outside a
  signal too — prefer spread/`Array.prototype` methods that return a new
  array (`.map()`, `.filter()`) over in-place mutation (`.push()`, `.splice()`,
  direct property assignment on a shared object).

## RxJS

- **Avoid nested subscriptions** — `a.subscribe(x => b.subscribe(...))` loses
  cancellation, is hard to read, and easily leaks. Use a flattening operator instead:
  - `switchMap` — cancels the previous inner observable when a new outer value
    arrives (the common case — e.g. a search-as-you-type request).
  - `mergeMap` — runs all inner observables concurrently, no cancellation.
  - `concatMap` — queues inner observables, runs them strictly in order.
  - `exhaustMap` — ignores new outer values while an inner observable is still
    running (e.g. a submit button that shouldn't double-fire).
  Picking the wrong one is a common, subtle bug source — if unsure which fits, default
  to `switchMap` for "latest wins" cases and flag anything more complex for review.
- **Clean up manual subscriptions** with `takeUntilDestroyed()`:
  ```ts
  private destroyRef = inject(DestroyRef);
  constructor() {
    someObservable$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...);
  }
  ```
  Prefer this over an `ngOnDestroy()` + manually-tracked `Subscription.unsubscribe()`.
  Better still, prefer the `async` pipe or `toSignal()` over a manual `subscribe()` in
  the first place (see Templates) — `takeUntilDestroyed()` is for the cases where a
  manual subscription is genuinely necessary.

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

- Test runner is **{{TEST_RUNNER}}** for this project (Vitest is Angular's default from
  v21 onward; v19/v20 default to Karma/Jasmine instead — this line reflects whichever
  applies to this specific project's Angular version, not a universal assumption).
  Test files are `*.spec.ts`, colocated with the file they test.
- Use `TestBed` for component/service tests as normal — the `describe`/`it`/`expect`
  API is the same shape across both runners.
- Write a test for any new component's key behavior and any new service's public
  methods. Do not skip tests to move faster — the hook running lint/tests will catch
  missing coverage on obvious cases, but don't rely on that as the only bar.
- **Testing anything that uses `HttpClient`**: use `provideHttpClientTesting()` +
  `HttpTestingController` — never `HttpClientTestingModule`, which is deprecated.
  ```ts
  TestBed.configureTestingModule({
    providers: [MyService, provideHttpClient(), provideHttpClientTesting()],
  });
  const httpTesting = TestBed.inject(HttpTestingController);
  // ...call the method under test, then:
  const req = httpTesting.expectOne('/api/things');
  req.flush(mockResponse);
  ```
  Always call `httpTesting.verify()` in `afterEach` to catch unexpected/unhandled
  requests — a test that doesn't verify can pass even if the code under test made an
  extra, unintended request.
- Prefer testing through the real service (`provideHttpClient()` + the testing backend)
  over hand-mocking the service itself — this exercises the actual interceptor chain
  (e.g. the auth/error interceptors from this project's bundles) rather than bypassing it.
- **Testing a component with a component-scoped provider** (e.g. a state service listed
  in that component's own `providers: [...]` array, not `providedIn: 'root'`): the test
  needs that same provider declared in `TestBed.configureTestingModule`'s own
  `providers` array too — the test doesn't automatically inherit the component's
  scoped instance. This is expected Angular DI behavior, not a bug to work around; just
  don't be surprised if a component-scoped provider needs listing in both places.
- **If this project's `styling` bundle is `material` (or any CDK-based component)**:
  prefer testing component interactions through its official **component harness**
  (`@angular/cdk/testing`, e.g. `TestbedHarnessEnvironment.loader(fixture)` then
  `loader.getHarness(SomeMaterialComponentHarness)`) over querying the component's
  internal DOM structure directly (`fixture.debugElement.query(By.css('.mat-mdc-...'))`)
  — harnesses are the stable, official contract; internal CSS classes are not, and
  querying them breaks on any Material version upgrade.
- **This project's unit tests do not cover end-to-end (whole-app, real-browser) user
  flows** — that's a separate testing layer this generator doesn't currently scaffold.
  Angular's own CLI supports adding one via `ng e2e` (offers Cypress, Playwright,
  WebdriverIO, Nightwatch, or Puppeteer — there's no single official default, it's a
  real project decision). If a task specifically calls for e2e coverage, flag it for a
  developer to set up deliberately rather than improvising one inline.

## Forms

{{FORMS_GUIDANCE}}
