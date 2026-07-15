# Feature Test Report — Tester 5

**Bundle combination tested:** `--auth=saml --data-layer=realtime --state=signals-only --roles=rbac --deploy-target=spa --i18n=single-language --offline=standard --styling=none --e2e=none`
**Angular version:** target requested: 19; actual: 19 (no substitution)
**Your Node version:** v22.14.0
**Date:** 2026-07-15

## Generation

- [x] `generate.js` completed without error — **with one caveat** (see below): all bundles applied, `npm install` ran, Husky/lint-staged configured. The very last step (the generator's own initial `git commit`) **failed** because the pre-commit hook ran `eslint --fix` and hit a lint error in a bundle-shipped file (`core/directives/has-role.directive.ts`). All generated files are on disk and fully usable; only the auto-commit did not land. See "Rule/CLAUDE.md guidance gaps" and the hook table for the full detail — this is a real generator defect worth fixing.
- [x] `npm install` succeeded. Warnings noted: `lint-staged@17.0.8` prints an `EBADENGINE` warning (wants Node `>=22.22.1`, local is v22.14.0) — non-fatal. `npm audit` reported 28 vulnerabilities (2 low, 10 moderate, 16 high) in the transitive dev tree — typical of a fresh Angular 19 workspace, not introduced by the feature.

### First generate attempt failed on a missing required flag (not a defect — assignment table is stale)

The assignment table inlined in the `run-feature-test` skill does **not** include an `--e2e` flag, but the generator now requires it (`❌ Missing --e2e=<option>. Required axes: ...e2e.`). Per the skill's "never ask, pick the conservative default, document it" rule I re-ran with `--e2e=none`. See "Assumptions made".

## The feature-building session

Order of what Claude Code did:

1. Read the generated guardrails/patterns before writing anything: `eslint.config.js`, `app.routes.ts`, `app.config.ts`, the RBAC directive/guard/roles-config, `auth.service.ts` (SAML), `realtime.service.ts` + `realtime.config.ts`, and the rule docs `angular.md` (forms), `state.md`, `data-layer.md`.
2. Confirmed forms approach from `angular.md`: Angular 19 → **Reactive Forms** (Signal Forms is v21+; the rule doc says so explicitly).
3. Created the Products feature under `src/app/features/products/`:
   - `models/product.model.ts` — `Product` interface.
   - `services/products.state.ts` — feature-scoped signals-only state service; realtime subscribe/emit; optimistic local add/delete; read-only public API + `computed()` filter.
   - `products.component.ts` / `.html` / `.scss` / `.spec.ts` — standalone `OnPush` component; Reactive Form add; `(input)`-driven search signal; `*hasRole` gating on delete; native `confirm()`; plain component-scoped SCSS.
4. Updated `src/app/app.routes.ts` — lazy `loadComponent` route for `products`.
5. Ran lint → found (a) the pre-existing directive-selector error in the bundle file and (b) three `no-empty-function` errors in my spec's fake `RealtimeService`. Fixed my own three; left the bundle bug untouched (reported here instead, per skill Step 7).
6. Ran build (pass) and tests (6/6 pass).

---

## Generated code — the most important section, do not skip or summarize

### src/app/app.routes.ts

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/products.component').then((m) => m.ProductsComponent),
  },
];
```

### src/app/features/products/models/product.model.ts

```ts
export interface Product {
  id: string;
  name: string;
  price: number;
}
```

### src/app/features/products/services/products.state.ts

```ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RealtimeService } from '../../../core/services/realtime.service';
import { Product } from '../models/product.model';

/**
 * Feature-scoped state for the Products feature. Follows the project's signals-only
 * pattern (see .claude/rules/state.md): plain signals behind a read-only public API,
 * mutations only through named methods.
 *
 * Data comes from the shared real-time socket (see .claude/rules/data-layer.md): we
 * subscribe to server events for the snapshot + deltas, and emit on local mutations.
 * Local updates are optimistic so the UI stays responsive without waiting on the round
 * trip. Provided at the component level, so its lifetime is scoped to the route.
 */
@Injectable()
export class ProductsState {
  private readonly realtime = inject(RealtimeService);

  private readonly productsSignal = signal<Product[]>([]);
  private readonly searchTermSignal = signal('');

  readonly products = this.productsSignal.asReadonly();
  readonly searchTerm = this.searchTermSignal.asReadonly();

  /** The list actually shown: filtered by a case-insensitive substring of the name. */
  readonly filteredProducts = computed(() => {
    const term = this.searchTermSignal().trim().toLowerCase();
    const all = this.productsSignal();
    if (!term) {
      return all;
    }
    return all.filter((product) => product.name.toLowerCase().includes(term));
  });

  constructor() {
    this.realtime.connect();

    this.realtime
      .on<Product[]>('products:snapshot')
      .pipe(takeUntilDestroyed())
      .subscribe((products) => this.productsSignal.set(products));

    this.realtime
      .on<Product>('product:created')
      .pipe(takeUntilDestroyed())
      .subscribe((product) => this.upsert(product));

    this.realtime
      .on<{ id: string }>('product:deleted')
      .pipe(takeUntilDestroyed())
      .subscribe(({ id }) => this.removeLocal(id));

    // Ask the server for the current list once we're wired up.
    this.realtime.emit('products:subscribe');
  }

  setSearchTerm(term: string): void {
    this.searchTermSignal.set(term);
  }

  addProduct(input: { name: string; price: number }): void {
    const product: Product = {
      id: crypto.randomUUID(),
      name: input.name,
      price: input.price,
    };
    // Optimistic insert at the top, then let the server know.
    this.productsSignal.update((list) => [product, ...list]);
    this.realtime.emit('product:create', product);
  }

  deleteProduct(id: string): void {
    // Optimistic removal, then let the server know.
    this.removeLocal(id);
    this.realtime.emit('product:delete', { id });
  }

  private upsert(product: Product): void {
    this.productsSignal.update((list) => {
      const exists = list.some((p) => p.id === product.id);
      return exists
        ? list.map((p) => (p.id === product.id ? product : p))
        : [product, ...list];
    });
  }

  private removeLocal(id: string): void {
    this.productsSignal.update((list) => list.filter((p) => p.id !== id));
  }
}
```

### src/app/features/products/products.component.ts

```ts
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HasRoleDirective } from '../../core/directives/has-role.directive';
import { APP_ROLES } from '../../core/config/roles.config';
import { ProductsState } from './services/products.state';

@Component({
  selector: 'featuretest5-products',
  standalone: true,
  imports: [ReactiveFormsModule, CurrencyPipe, HasRoleDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ProductsState],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent {
  private readonly fb = inject(FormBuilder);
  protected readonly state = inject(ProductsState);

  /** Only these roles see the delete control (see .claude/rules/roles.md). */
  protected readonly adminRoles = [APP_ROLES.ADMIN];

  protected readonly showAddForm = signal(false);

  protected readonly addForm = this.fb.group({
    name: ['', [Validators.required]],
    price: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  protected onSearch(event: Event): void {
    this.state.setSearchTerm((event.target as HTMLInputElement).value);
  }

  protected toggleAddForm(): void {
    this.showAddForm.update((visible) => !visible);
    if (!this.showAddForm()) {
      this.addForm.reset();
    }
  }

  protected submitProduct(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const { name, price } = this.addForm.getRawValue();
    this.state.addProduct({ name: (name ?? '').trim(), price: price as number });
    this.addForm.reset();
    this.showAddForm.set(false);
  }

  protected deleteProduct(id: string, name: string): void {
    if (confirm(`Delete "${name}"?`)) {
      this.state.deleteProduct(id);
    }
  }
}
```

### src/app/features/products/products.component.html

```html
<section class="products">
  <header class="products__header">
    <h1>Products</h1>
    <button type="button" (click)="toggleAddForm()">
      {{ showAddForm() ? 'Cancel' : '+ Add Product' }}
    </button>
  </header>

  @if (showAddForm()) {
    <form class="add-form" [formGroup]="addForm" (ngSubmit)="submitProduct()">
      <div class="field">
        <label for="product-name">Name</label>
        <input id="product-name" type="text" formControlName="name" />
        @if (addForm.controls.name.touched && addForm.controls.name.invalid) {
          <p class="error">Name is required.</p>
        }
      </div>

      <div class="field">
        <label for="product-price">Price</label>
        <input id="product-price" type="number" step="0.01" formControlName="price" />
        @if (addForm.controls.price.touched && addForm.controls.price.invalid) {
          <p class="error">Price must be greater than 0.</p>
        }
      </div>

      <button type="submit" [disabled]="addForm.invalid">Save</button>
    </form>
  }

  <div class="field field--search">
    <label for="product-search">Search</label>
    <input
      id="product-search"
      type="search"
      placeholder="Filter by name…"
      (input)="onSearch($event)"
    />
  </div>

  @if (state.filteredProducts().length === 0) {
    <p class="empty">No products to show.</p>
  } @else {
    <ul class="product-list">
      @for (product of state.filteredProducts(); track product.id) {
        <li class="product-list__item">
          <span class="product-list__name">{{ product.name }}</span>
          <span class="product-list__price">{{ product.price | currency }}</span>
          <button
            *hasRole="adminRoles"
            type="button"
            class="product-list__delete"
            (click)="deleteProduct(product.id, product.name)"
          >
            Delete
          </button>
        </li>
      }
    </ul>
  }
</section>
```

### src/app/features/products/products.component.scss

```scss
.products {
  display: block;
  max-width: 40rem;
  margin: 0 auto;
  padding: 1.5rem;
}

.products__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;

  label {
    font-weight: 600;
    font-size: 0.875rem;
  }

  input {
    padding: 0.5rem 0.625rem;
    border: 1px solid #ccc;
    border-radius: 0.375rem;
    font: inherit;
  }
}

.field--search {
  margin: 1rem 0;
}

.add-form {
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 0.5rem;
}

.error {
  margin: 0;
  color: #b00020;
  font-size: 0.8125rem;
}

.empty {
  color: #666;
  font-style: italic;
}

.product-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.product-list__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid #eee;
}

.product-list__name {
  flex: 1;
}

.product-list__price {
  font-variant-numeric: tabular-nums;
  color: #333;
}

.product-list__delete {
  border: 1px solid #b00020;
  background: transparent;
  color: #b00020;
  border-radius: 0.375rem;
  padding: 0.25rem 0.625rem;
  cursor: pointer;

  &:hover {
    background: #b00020;
    color: #fff;
  }
}

button {
  font: inherit;
}
```

### src/app/features/products/products.component.spec.ts

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideExperimentalZonelessChangeDetection, signal } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { ProductsComponent } from './products.component';
import { ProductsState } from './services/products.state';
import { RealtimeService } from '../../core/services/realtime.service';
import { AuthService, CurrentUser } from '../../core/services/auth.service';

class FakeRealtimeService {
  readonly connected = signal(false);
  connect(): void {
    this.connected.set(true);
  }
  disconnect(): void {
    this.connected.set(false);
  }
  on<T>(): Observable<T> {
    return EMPTY;
  }
  emit(): void {
    // No-op: tests drive state through ProductsState's public API directly.
    return;
  }
}

class FakeAuthService {
  readonly currentUser = signal<CurrentUser | null>({
    id: '1',
    email: 'admin@example.com',
    name: 'Admin',
    roles: ['admin'],
  });
}

describe('ProductsComponent', () => {
  let fixture: ComponentFixture<ProductsComponent>;
  let state: ProductsState;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        provideExperimentalZonelessChangeDetection(),
        { provide: RealtimeService, useClass: FakeRealtimeService },
        { provide: AuthService, useClass: FakeAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsComponent);
    state = fixture.debugElement.injector.get(ProductsState);
    fixture.detectChanges();
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('renders the heading and an empty message initially', () => {
    expect(text()).toContain('Products');
    expect(text()).toContain('No products to show.');
  });

  it('filters the visible list by a case-insensitive name match', () => {
    state.addProduct({ name: 'Apple', price: 1 });
    state.addProduct({ name: 'Banana', price: 2 });
    fixture.detectChanges();
    expect(text()).toContain('Apple');
    expect(text()).toContain('Banana');

    state.setSearchTerm('app');
    fixture.detectChanges();
    expect(text()).toContain('Apple');
    expect(text()).not.toContain('Banana');
  });

  it('removes a product when delete is confirmed', () => {
    state.addProduct({ name: 'Apple', price: 1 });
    fixture.detectChanges();
    expect(state.products().length).toBe(1);

    spyOn(window, 'confirm').and.returnValue(true);
    const deleteBtn = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '.product-list__delete',
    );
    expect(deleteBtn).not.toBeNull();
    deleteBtn!.click();
    fixture.detectChanges();

    expect(state.products().length).toBe(0);
    expect(text()).not.toContain('Apple');
  });
});
```

---

## Rule compliance self-check

**Architecture (`architecture.md`)**
- [x] New feature lives under `features/products/`, not scattered elsewhere
- [x] Container/presentational split — for a feature this size a single smart component + a state service is the right altitude; state lives in `products.state.ts`, not the component
- [x] No `HttpClient` injected directly in a component — the component talks only to `ProductsState`, which talks to the shared `RealtimeService`

**Angular patterns (`angular.md`)**
- [x] `@for` has `track product.id`
- [x] No `@Input()`/`@Output()` decorators mixed with `input()`/`output()` — none used in the feature
- [x] State updates are immutable (`.update(list => [product, ...list])` / `.filter(...)` / `.map(...)`, never `.push()`)
- [x] No non-trivial method calls in template expressions — template reads `state.filteredProducts()` and `showAddForm()` (signals) and `addForm.controls.*` (property access); no work-doing method calls
- [x] Forms use the approach `angular.md` documents for this target: **Reactive Forms** (v19; Signal Forms is v21+). Verified against the actual rule file, not assumed.
- [x] Zoneless-safe: state changes are signal-driven; no reliance on zone auto-CD. Spec uses `provideExperimentalZonelessChangeDetection()`.

**Accessibility (`accessibility.md`)**
- [x] No `<div>`/`<span>` with `(click)`/`tabindex` — all interactive elements are real `<button>`s; delete is a `<button>` with visible text
- [x] Every input has an associated `<label for>`; search input additionally has an explicit label
- [x] No custom interactive widget built (native `confirm()` used for the delete confirmation, per spec — no hand-rolled modal), so no CDK question arises

**Security (`security.md`)**
- [x] No hardcoded API/socket URLs — the socket URL comes from `realtime.config.ts` → `environment.ts` via the shared `RealtimeService`; the feature never references a URL
- [x] No `DomSanitizer.bypassSecurityTrust*` calls
- [x] No secrets/keys hardcoded

**Styling (`styling` bundle is `none`)**
- N/A for library components. Plain component-scoped SCSS written; a few literal hex colors used (`#b00020`, `#ccc`, etc.). See note below — the `check-hardcoded-colors.sh` hook exists and this is exactly the pattern it targets, but on a `styling=none` project there is no token system to route them through. Flagged under "guidance gaps".

**Testing**
- [x] New component has a co-located `.spec.ts`. (`ProductsState` is exercised through the component spec via `fixture.debugElement.injector.get(ProductsState)` rather than a separate file; the state's add/delete/filter logic is covered there.)
- [x] Tests assert real behavior: initial render + empty state, search actually filtering (Banana disappears), delete actually removing (list length 1 → 0, "Apple" gone), and the delete button is only present because the faked user is an admin (RBAC gating exercised)

## Hook behavior observed

| Hook | What triggered it | Correct block, or false positive? | Notes |
|---|---|---|---|
| `eslint --fix` (via Husky pre-commit / lint-staged) | The generator's own final `git commit` during generation | **Correct block of a real defect — but the defect is in a bundle-shipped file, not user code** | Blocked on `core/directives/has-role.directive.ts:16` — selector `[hasRole]` violates `@angular-eslint/directive-selector` which requires prefix `featuretest5`. This means a fresh `saml/realtime/rbac` project **cannot make its own initial commit** out of the box. See guidance gaps. |
| `check-hardcoded-colors.sh` | Not observed firing (feature files were written via the editor, not through a hook-instrumented path in this session) | — | The SCSS does contain literal hex colors; on a `styling=none` project there's no token layer to use instead. Noted so central-brain can decide whether this hook should be relaxed/skipped for `styling=none`. |

Note: hooks fire on Claude Code's own Edit/Write tool calls per `.claude/settings.json`; during this session the file writes did not surface any blocking hook output other than the lint-staged failure during generation. No `check-tsc`, `check-missing-spec`, `check-mixed-input-apis`, `check-no-httpclient-in-component`, or `check-hardcoded-api-url` blocks were observed against the feature files.

## Anything that should have been blocked, but wasn't

Nothing in the **feature** code violates a rule that a hook missed. The one live rule violation in the repo is the **pre-existing bundle file** `has-role.directive.ts` (selector prefix) — and it *was* caught, by lint/pre-commit. It just ships broken from the generator so the catch fires against generated code the user didn't write.

The SCSS literal-color question (above) is the only debatable item, and it's arguably not a violation on a `styling=none` project where tokens don't exist.

## Rule/CLAUDE.md guidance gaps

1. **[Real generator bug — highest priority] `roles/rbac` bundle's `has-role.directive.ts` selector is not prefix-compliant.** The base generator rewrites the *component* selector prefix (to `featuretest5`) and updates `index.html`, and the eslint config enforces `@angular-eslint/directive-selector` with `prefix: featuretest5, style: camelCase`. But the rbac bundle ships the directive with `selector: '[hasRole]'` — no prefix at all. Consequences:
   - `ng lint` fails out of the box (1 error) on any `rbac` project.
   - The generator's own initial `git commit` fails (pre-commit runs `eslint --fix`), so a freshly generated rbac repo has no clean initial commit.
   - Note the directive would fail even the *default* Angular `app` prefix — `[hasRole]` has no prefix — so this isn't purely an artifact of the project-name rewrite; the bundle file itself is non-compliant.
   - **Suggested fixes for central-brain (do not want me touching `bundles/`):** either (a) ship the directive as `[appHasRole]`/prefix-templated and have the selector participate in the same prefix-rewrite pass the component selector goes through, or (b) rename to a prefixed camelCase selector and update the documented usage + `roles.md`, or (c) add a scoped eslint override exempting `core/directives/has-role.directive.ts`. Option (a) is the most consistent with how the component selector is already handled. Whatever is chosen, the documented usage comment (`*hasRole="[APP_ROLES.ADMIN]"`) and `roles.md` examples must be updated to match.
   - **Impact on this test:** I used the `*hasRole` pattern exactly as the bundle documents it (my template line: `*hasRole="adminRoles"`). My usage is fine — only the directive's own declaration fails lint. Per skill Step 7 I did **not** edit the bundle-origin file; the lint failure is left in place and reported here.

2. **Assignment table missing `--e2e`.** The `run-feature-test` skill's inlined table (all 6 rows) predates the `e2e` axis, which the generator now requires. Every tester will hit `❌ Missing --e2e=<option>` on the first run. Table should be updated to include an e2e flag per row.

3. **`styling=none` vs `check-hardcoded-colors.sh`.** On a `styling=none` project there is no design-token layer, so any non-trivial component CSS will use literal colors. The rule/hook that discourages hardcoded colors implicitly assumes a token system exists. Worth a one-line carve-out in `styling.md` (or the hook) clarifying that literal colors in component-scoped SCSS are acceptable when `styling=none`, so this isn't later flagged as a violation.

4. **Minor: `Validators.min(0.01)` vs "greater than 0".** The spec says price "must be greater than 0". `Validators.min` is inclusive, so I used `min(0.01)` (one cent) as the practical "> 0" for a currency field. `min(0)` would incorrectly allow 0. Not a rule gap, just documenting the choice.

## Final verification

| Check | Result |
|---|---|
| `ng lint` | **FAIL — 1 error, pre-existing generator bug only.** `core/directives/has-role.directive.ts:16` selector-prefix violation (see gaps #1). All **feature** files lint clean (I fixed 3 `no-empty-function` errors in my own spec's fake service before this result). |
| `ng build` | **PASS.** `Application bundle generation complete. [4.678 seconds]`. Products emitted as a lazy chunk (`products-component 84.16 kB`), confirming the lazy route wired up correctly. |
| `ng test` | **PASS — 6/6** (`TOTAL: 6 SUCCESS`): 3 default `app.component` specs + 3 new `ProductsComponent` specs. Required setting `CHROME_BIN` to the macOS Chrome path (see assumptions). |

## Assumptions made

1. **`--e2e=none`.** The generator required `--e2e` but the assignment table has no such flag. Chose `none` as the conservative/minimal default — it also avoids the interactive Playwright-initializer hang noted in prior sessions. (Assignment 5 is a SAML/realtime/rbac SPA test; e2e tooling is orthogonal to what's under test here.)
2. **Kept the failed generator auto-commit as-is.** The generation's final `git commit` failed on the bundle lint bug. Rather than working around it (e.g. `--no-verify` committing, or editing the bundle file), I left the files on disk uncommitted and built the feature on top — the `run-feature-test` skill only pushes the *report*, not the generated project, so a missing initial commit in `/tmp` is irrelevant to the deliverable, and the failure itself is the valuable finding.
3. **Did not edit `has-role.directive.ts` to make lint pass.** Per skill Step 7 ("do not touch bundle-origin behavior; report bugs instead"), I left the one lint error and reported it, rather than masking it by prefixing the selector locally. This keeps `ng lint`'s FAIL result an honest signal about the generator.
4. **`ProductsState` covered via the component spec** rather than a separate `products.state.spec.ts`. The state's add/delete/filter logic is fully exercised through `fixture.debugElement.injector.get(ProductsState)` in the component spec; a separate file would duplicate the same assertions.
5. **`CHROME_BIN` set to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.** Karma's `ChromeHeadless` couldn't find a browser on PATH; Chrome was present as a macOS `.app`. Pointed `CHROME_BIN` at it to run the suite. This is an environment detail, not a project change.
6. **Realtime "backend" is assumed, not built.** Per the spec, for a real backend data-layer I wrote the service assuming conventional socket event names (`products:snapshot`, `product:created`, `product:deleted` inbound; `products:subscribe`, `product:create`, `product:delete` outbound). No backend exists; local updates are optimistic so the UI/tests work without one.
7. **Called `realtime.connect()` from the state service constructor.** `data-layer.md` says connect "once, typically at app startup or on login — check `app.config.ts` first." Nothing in this generated project calls `connect()` anywhere yet, and `RealtimeService.connect()` is idempotent (early-returns if a socket exists), so connecting from the feature's state service is safe and self-contained. Flagging in case central-brain would prefer a canonical app-startup call site to be shipped by the `realtime` and/or `saml` bundles.

## Anything else worth flagging

- **The single most important takeaway:** `roles=rbac` produces a repo that fails `ng lint` and cannot self-commit out of the box, purely because of the `has-role.directive.ts` selector prefix. This will hit every rbac client on day one. Prioritize gap #1.
- The `saml` auth bundle's `AuthService` is a clean thin server-side-delegation wrapper (no XML/assertion handling in the browser) — it composed well with rbac: `CurrentUser.roles` is exactly what both `roleGuard` and `HasRoleDirective` read, so the feature's role gating needed no glue.
- The `realtime` + `signals-only` combo is ergonomic: subscribing to socket events and pushing into a signal, with a `computed()` filter on top, is a natural fit and needed no state library — the `signals-only` guardrails held up fine against a realtime source.
- `lint-staged@17` wants Node `>=22.22.1` (local v22.14.0) — only a warning today, but worth noting the base pins a lint-staged version slightly ahead of what a common Node 22.14 dev machine satisfies.
