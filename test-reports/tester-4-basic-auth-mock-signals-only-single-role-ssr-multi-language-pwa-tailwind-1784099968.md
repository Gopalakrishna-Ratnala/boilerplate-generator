# Feature Test Report — Tester 4

**Bundle combination tested:** `--auth=basic-auth --data-layer=mock --state=signals-only --roles=single-role --deploy-target=ssr --i18n=multi-language --offline=pwa --styling=tailwind --e2e=none`
**Angular version:** requested "latest" (no `--angular-version` flag); `ng new` resolved to Angular 21 (`@angular/core: ^21.2.0`) locally rather than 22, per generate.js's own note (see Assumptions).
**Your Node version:** v20.20.2
**Date:** 2026-07-15

## Generation

- [x] `generate.js` completed without error
- [x] `npm install` succeeded (one `EBADENGINE` warning for `lint-staged`/`listr2` wanting Node ≥22.13/22.22 — cosmetic, husky still configured successfully; noted below)

## The feature-building session

1. Ran `generate.js` for tester 4's assignment. Command needed a `--e2e=<option>` flag not listed in the assignment table (the tool now validates 9 axes, not 8) — defaulted to `--e2e=none` since e2e wasn't part of this assignment's original spec, and noted it as an assumption.
2. Generation succeeded end-to-end (base scaffold, ESLint, all 8 bundles, `ng add @angular/ssr`, `ng add @jsverse/transloco`, `ng add @angular/pwa`, `ng add tailwindcss`, husky/lint-staged, initial commit).
3. Read `.claude/rules/angular.md`, `state.md`, `data-layer.md`, `architecture.md`, `styling.md`, `i18n.md`, `auth.md` before writing any code, to confirm the actual documented patterns (Signal Forms for this v21 target, feature-scoped signal state service, mock+`mockResponse()` data layer, Tailwind v4 `@theme` tokens, Transloco `t` pipe/service, `authGuard` route protection).
4. Verified the real Signal Forms API surface directly from the installed `@angular/forms/types/signals.d.ts` / compiled `signals.mjs` (no reference example existed anywhere in this repo's bundles) rather than guessing at `form()`/`submit()`/`[formField]` signatures.
5. Created:
   - `src/app/features/products/models/product.model.ts`
   - `src/app/features/products/services/products.service.ts` (mock fixture + `mockResponse()`)
   - `src/app/features/products/services/products.state.ts` (feature-scoped signal state, not `providedIn: 'root'`)
   - `src/app/features/products/pages/products-list/products-list.{ts,html,scss,spec.ts}`
   - `src/app/features/products/products.routes.ts` (route-level `providers: [ProductsState]`, `canActivate: [authGuard]`)
   - Updated `src/app/app.routes.ts` to lazy-load the new route
   - Added translation keys to `public/i18n/en.json` and `public/i18n/es.json`
   - Added semantic `@theme` tokens (`--color-primary`, `--color-danger`, `--color-surface`, `--color-border`, `--color-muted`, plus hover variants) to `src/tailwind.css`
6. Ran `ng lint`, `ng build`, `ng test` — all passed after one test-timing fix (see Gaps section).

---

## Generated code

### src/app/features/products/models/product.model.ts

```ts
export interface Product {
  id: string;
  name: string;
  price: number;
}
```

### src/app/features/products/services/products.service.ts

```ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { mockResponse } from '../../../shared/services/mock-response';
import { Product } from '../models/product.model';

const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Wireless Mouse', price: 24.99 },
  { id: '2', name: 'Mechanical Keyboard', price: 89.5 },
  { id: '3', name: '27" Monitor', price: 249.0 },
  { id: '4', name: 'USB-C Hub', price: 39.99 },
  { id: '5', name: 'Webcam', price: 59.0 },
];

@Injectable({ providedIn: 'root' })
export class ProductsService {
  getProducts(): Observable<Product[]> {
    return mockResponse(MOCK_PRODUCTS);
  }
}
```

### src/app/features/products/services/products.state.ts

```ts
import { Injectable, computed, inject, signal } from '@angular/core';

import { ProductsService } from './products.service';
import { Product } from '../models/product.model';

@Injectable()
export class ProductsState {
  private readonly productsService = inject(ProductsService);

  private readonly productsSignal = signal<Product[]>([]);
  private readonly searchTermSignal = signal('');

  readonly searchTerm = this.searchTermSignal.asReadonly();

  readonly filteredProducts = computed(() => {
    const term = this.searchTermSignal().trim().toLowerCase();
    const products = this.productsSignal();
    if (!term) {
      return products;
    }
    return products.filter((product) => product.name.toLowerCase().includes(term));
  });

  loadProducts(): void {
    this.productsService.getProducts().subscribe((products) => {
      this.productsSignal.set(products);
    });
  }

  setSearchTerm(term: string): void {
    this.searchTermSignal.set(term);
  }

  addProduct(product: Product): void {
    this.productsSignal.update((products) => [product, ...products]);
  }

  removeProduct(id: string): void {
    this.productsSignal.update((products) => products.filter((product) => product.id !== id));
  }
}
```

### src/app/features/products/pages/products-list/products-list.ts

```ts
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { form, FormField, min, required, submit } from '@angular/forms/signals';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

import { ProductsState } from '../../services/products.state';
import { Product } from '../../models/product.model';

interface NewProductForm {
  name: string;
  price: number;
}

@Component({
  selector: 'featuretest4-products-list',
  imports: [FormField, TranslocoModule, CurrencyPipe],
  templateUrl: './products-list.html',
  styleUrl: './products-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsList {
  protected readonly state = inject(ProductsState);
  private readonly transloco = inject(TranslocoService);

  protected readonly showAddForm = signal(false);

  protected readonly newProductModel = signal<NewProductForm>({ name: '', price: 0 });
  protected readonly newProductForm = form(this.newProductModel, (path) => {
    required(path.name);
    required(path.price);
    min(path.price, 0.01);
  });

  constructor() {
    this.state.loadProducts();
  }

  protected onSearchInput(term: string): void {
    this.state.setSearchTerm(term);
  }

  protected toggleAddForm(): void {
    this.showAddForm.update((visible) => !visible);
  }

  protected async submitNewProduct(): Promise<void> {
    await submit(this.newProductForm, async (field) => {
      const value = field().value();
      const product: Product = {
        id: crypto.randomUUID(),
        name: value.name,
        price: value.price,
      };
      this.state.addProduct(product);
      this.newProductModel.set({ name: '', price: 0 });
      this.showAddForm.set(false);
      return undefined;
    });
  }

  protected deleteProduct(product: Product): void {
    const message = this.transloco.translate('products.deleteConfirm', { name: product.name });
    if (confirm(message)) {
      this.state.removeProduct(product.id);
    }
  }
}
```

### src/app/features/products/pages/products-list/products-list.html

```html
<section class="mx-auto max-w-3xl p-6">
  <div class="mb-6 flex items-center justify-between">
    <h1 class="text-2xl font-semibold">{{ 'products.title' | transloco }}</h1>
    <button
      type="button"
      class="rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover"
      (click)="toggleAddForm()"
    >
      {{ (showAddForm() ? 'products.cancelButton' : 'products.addButton') | transloco }}
    </button>
  </div>

  @if (showAddForm()) {
    <form
      class="mb-6 flex flex-col gap-3 rounded border border-border bg-surface p-4"
      (submit)="$event.preventDefault(); submitNewProduct()"
    >
      <div class="flex flex-col gap-1">
        <label for="product-name">{{ 'products.form.nameLabel' | transloco }}</label>
        <input
          id="product-name"
          type="text"
          [formField]="newProductForm.name"
          class="rounded border border-border px-3 py-2"
        />
      </div>
      <div class="flex flex-col gap-1">
        <label for="product-price">{{ 'products.form.priceLabel' | transloco }}</label>
        <input
          id="product-price"
          type="number"
          [formField]="newProductForm.price"
          class="rounded border border-border px-3 py-2"
        />
      </div>
      <button
        type="submit"
        class="self-start rounded bg-primary px-4 py-2 text-white hover:bg-primary-hover"
      >
        {{ 'products.form.submit' | transloco }}
      </button>
    </form>
  }

  <input
    type="text"
    class="mb-4 w-full rounded border border-border px-3 py-2"
    [placeholder]="'products.searchPlaceholder' | transloco"
    [value]="state.searchTerm()"
    (input)="onSearchInput($any($event.target).value)"
  />

  @if (state.filteredProducts().length === 0) {
    <p class="text-muted">{{ 'products.emptyState' | transloco }}</p>
  } @else {
    <table class="w-full border-collapse">
      <thead>
        <tr class="border-b border-border text-left">
          <th class="py-2">{{ 'products.table.name' | transloco }}</th>
          <th class="py-2">{{ 'products.table.price' | transloco }}</th>
          <th class="py-2">{{ 'products.table.actions' | transloco }}</th>
        </tr>
      </thead>
      <tbody>
        @for (product of state.filteredProducts(); track product.id) {
          <tr class="border-b border-border">
            <td class="py-2">{{ product.name }}</td>
            <td class="py-2">{{ product.price | currency }}</td>
            <td class="py-2">
              <button
                type="button"
                class="rounded bg-danger px-3 py-1 text-white hover:bg-danger-hover"
                (click)="deleteProduct(product)"
              >
                {{ 'products.delete' | transloco }}
              </button>
            </td>
          </tr>
        }
      </tbody>
    </table>
  }
</section>
```

### src/app/features/products/pages/products-list/products-list.scss

```scss
(empty — all styling done via Tailwind utility classes in the template)
```

### src/app/features/products/pages/products-list/products-list.spec.ts

```ts
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { ProductsList } from './products-list';
import { ProductsState } from '../../services/products.state';

const EN_TRANSLATIONS = {
  products: {
    title: 'Products',
    searchPlaceholder: 'Search products by name...',
    addButton: '+ Add Product',
    cancelButton: 'Cancel',
    emptyState: 'No products found.',
    table: { name: 'Name', price: 'Price', actions: 'Actions' },
    delete: 'Delete',
    deleteConfirm: 'Are you sure you want to delete "{{name}}"?',
    form: { nameLabel: 'Name', priceLabel: 'Price', submit: 'Add Product' },
  },
};

describe('ProductsList', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProductsList,
        TranslocoTestingModule.forRoot({
          langs: { en: EN_TRANSLATIONS },
          translocoConfig: { availableLangs: ['en'], defaultLang: 'en' },
        }),
      ],
      providers: [ProductsState],
    }).compileComponents();
  });

  it('renders the seeded products', async () => {
    const fixture = TestBed.createComponent(ProductsList);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('Wireless Mouse');
  });

  it('filters the list as the user types in the search box', async () => {
    const fixture = TestBed.createComponent(ProductsList);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="text"]');
    input.value = 'keyboard';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Mechanical Keyboard');
  });

  it('removes a product when delete is confirmed', async () => {
    const fixture = TestBed.createComponent(ProductsList);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const deleteButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      'tbody tr button',
    );
    deleteButton.click();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
    expect(fixture.nativeElement.textContent).not.toContain('Wireless Mouse');
  });
});
```

### src/app/features/products/products.routes.ts

```ts
import { Routes } from '@angular/router';

import { authGuard } from '../../core/guards/auth.guard';
import { ProductsState } from './services/products.state';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    providers: [ProductsState],
    loadComponent: () =>
      import('./pages/products-list/products-list').then((m) => m.ProductsList),
  },
];
```

### src/app/app.routes.ts (updated)

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'products',
    loadChildren: () => import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
  },
];
```

### src/tailwind.css (updated)

```css
@import 'tailwindcss';

@theme {
  --color-primary: oklch(0.55 0.18 258);
  --color-primary-hover: oklch(0.48 0.18 258);
  --color-danger: oklch(0.58 0.22 25);
  --color-danger-hover: oklch(0.5 0.22 25);
  --color-surface: oklch(0.99 0 0);
  --color-border: oklch(0.88 0 0);
  --color-muted: oklch(0.55 0 0);
}
```

### public/i18n/en.json (updated)

```json
{
  "products": {
    "title": "Products",
    "searchPlaceholder": "Search products by name...",
    "addButton": "+ Add Product",
    "cancelButton": "Cancel",
    "emptyState": "No products found.",
    "table": {
      "name": "Name",
      "price": "Price",
      "actions": "Actions"
    },
    "delete": "Delete",
    "deleteConfirm": "Are you sure you want to delete \"{{name}}\"?",
    "form": {
      "nameLabel": "Name",
      "priceLabel": "Price",
      "submit": "Add Product"
    }
  }
}
```

### public/i18n/es.json (updated)

```json
{
  "products": {
    "title": "Productos",
    "searchPlaceholder": "Buscar productos por nombre...",
    "addButton": "+ Agregar Producto",
    "cancelButton": "Cancelar",
    "emptyState": "No se encontraron productos.",
    "table": {
      "name": "Nombre",
      "price": "Precio",
      "actions": "Acciones"
    },
    "delete": "Eliminar",
    "deleteConfirm": "¿Está seguro de que desea eliminar \"{{name}}\"?",
    "form": {
      "nameLabel": "Nombre",
      "priceLabel": "Precio",
      "submit": "Agregar Producto"
    }
  }
}
```

---

## Rule compliance self-check

**Architecture (`architecture.md`)**
- [x] New feature lives under `features/products/`, not scattered elsewhere
- [x] Container/presentational split followed — this is a small single-page feature so
      it's one container ("smart") component under `pages/`, no presentational split
      was warranted for a feature this size
- [x] No `HttpClient` injected directly in a component (goes through `ProductsService`)

**Angular patterns (`angular.md`)**
- [x] `@for` has `track` (`track product.id`)
- [x] No `@Input()`/`@Output()` decorators used at all (no inputs/outputs on this
      component)
- [x] State updates are immutable (`.update(products => [product, ...products])` /
      `.filter(...)`, never `.push()`/`.splice()`)
- [x] No non-trivial method calls in template expressions — only signal reads
      (`state.filteredProducts()`) and the `transloco`/`currency` pipes
- [x] Forms use Signal Forms (`@angular/forms/signals`) per this project's actual v21
      `angular.md` guidance — confirmed against the file before writing any code, not
      assumed

**Accessibility (`accessibility.md`)**
- [x] No `<div>`/`<span>` given `(click)`/`tabindex` — all interactive elements are
      real `<button>`/`<input>`/`<form>` elements
- [x] No custom interactive widget was built (no dropdown/modal/tabs), so the CDK
      requirement doesn't apply here

**Security (`security.md`)**
- [x] No hardcoded API URLs (mock data layer, no `HttpClient` calls)
- [x] No `DomSanitizer.bypassSecurityTrust*` calls
- [x] No secrets/keys hardcoded anywhere

**Styling (Tailwind)**
- [x] Used real Tailwind utility classes throughout
- [x] No hardcoded hex/rgb/hsl colors — added `@theme` tokens (`--color-primary`,
      `--color-danger`, `--color-surface`, `--color-border`, `--color-muted`, hover
      variants) and used only the semantic classes they generate (`bg-primary`,
      `bg-danger`, `border-border`, `text-muted`, etc.), never a raw palette utility
      like `bg-blue-500`

**Testing**
- [x] New component has a co-located `.spec.ts`
- [x] Tests assert real behavior: initial render of all 5 seeded products, search
      actually filtering to 1 matching row, delete actually removing a row (with
      `window.confirm` stubbed to return `true`) — not just "component created"

## Hook behavior observed

| Hook | What triggered it | Correct block, or false positive? | Notes |
|---|---|---|---|
| (none observed) | — | — | This test session's Claude Code instance was rooted at the `boilerplate-generator` repo, not inside the generated `/tmp/feature-test-4/feature-test-4` project. The generated project's own `.claude/settings.json` hooks (`check-hardcoded-colors.sh`, `check-raw-tailwind-utility.sh`, `check-interactive-div-span.sh`, `check-mixed-input-apis.sh`, `check-no-httpclient-in-component.sh`, `check-for-track.sh`, `check-hardcoded-api-url.sh`, `format-and-lint.sh`, `check-tsc.sh`, `check-missing-spec.sh`) never actually fired during this session, because Claude Code hooks are sourced from the *session's* root working directory's `.claude/settings.json`, not from a nested subdirectory's settings file. **This means the guardrail layer described in this project's design was not genuinely exercised by this test** — I followed the rule files by manually reading them, but the actual hook enforcement mechanism (the thing that's supposed to catch a violation even if the agent doesn't manually check) was not in effect. Flagging this as a real gap in how `run-feature-test` is currently structured — to genuinely test the hooks, whoever runs this skill would need to launch/scope a Claude Code session with cwd inside the generated project itself. |

## Anything that should have been blocked, but wasn't

Nothing rule-violating was written (per the self-check above), so there's nothing a
hook should have caught in the code itself. The real gap is procedural (see previous
section) — the hooks had no opportunity to fire at all, correct or not, because of how
this session was scoped.

## Rule/CLAUDE.md guidance gaps

- **`--e2e` axis not in the assignment table.** `generate.js` now requires 9 axes
  (auth, data-layer, state, roles, deploy-target, i18n, offline, styling, **e2e**) but
  this skill's inlined assignment table (Step 2) only lists 8. Defaulted to
  `--e2e=none` since none of the 6 assignments' original intent mentioned e2e testing,
  and it's the least invasive choice. The assignment table / skill should be updated to
  include an explicit `--e2e` flag per row.
- **Root-route prerender error on `ng build`** (see Final verification below) —
  `AuthService.readStoredToken()` throws `ReferenceError: localStorage is not defined`
  during SSR prerendering. This is **not** caused by the Products feature — `app.routes.ts`
  had zero routes before I added `/products`, and the error is thrown while prerendering
  Angular's default `""` route against the root `App` component tree, which eagerly
  instantiates `AuthService` (`providedIn: 'root'`) via something in the root injector
  graph. `AuthService` is a protected file so I did not touch it or attempt a fix — noting
  it here as a pre-existing `basic-auth` + `deploy-target=ssr` combination bug for the
  central-brain session to investigate. The build still completes and reports success
  (exit code 0, "Prerendered 1 static route"), so this appears to be a caught/logged
  error rather than a fatal one, but it will pollute real build logs.
- **`whenStable()` doesn't wait for the mock data-layer's simulated network delay.**
  `mockResponse()` uses `of(value).pipe(delay(delayMs))`, which schedules via
  `setTimeout` — under this project's zoneless change detection, Angular's `whenStable()`
  does not track raw `setTimeout` calls as pending work (only `PendingTasks`-integrated
  async operations), so the first version of my spec (using `await fixture.whenStable()`
  immediately after `detectChanges()`) asserted against an empty product list and failed.
  Fixed by awaiting a real `setTimeout` longer than the mock delay before re-running
  `detectChanges()`. This is a real, easy-to-hit trap for anyone testing a `mock`
  data-layer component in a zoneless project and might be worth a callout in
  `data-layer.md` or `angular.md`'s testing guidance.

## Final verification

| Check | Result |
|---|---|
| `ng lint` | ✅ Pass — "All files pass linting." |
| `ng build` | ✅ Pass (exit 0) — but logs a non-fatal `ReferenceError: localStorage is not defined` during prerendering of the root route (pre-existing `basic-auth`+`ssr` issue, see Gaps above); browser + server + lazy `products-list`/`products-routes` chunks all emitted correctly |
| `ng test` | ✅ Pass — 5/5 tests passed across 2 spec files (the pre-existing `app.spec.ts` plus the new `products-list.spec.ts`) |

## Assumptions made

- **`--e2e` flag**: not part of the original 8-axis assignment table; defaulted to
  `--e2e=none` since none of the 6 assignments call for e2e testing and it's the
  least invasive choice given generate.js now requires it.
- **Angular version substitution**: requested "latest" (no flag); `ng new` itself
  resolved to Angular 21.2.0 rather than 22 — generate.js detected and logged this
  itself ("likely a local Node/CLI resolution difference") and correctly re-derived
  all downstream decisions (ESLint version, Signal Forms guidance) off the *actual*
  scaffolded version (21), not the original guess. I did not need to intervene.
- **Signal Forms API**: since no example existed anywhere in this repo's bundles, I
  verified the actual exported symbols and signatures directly from the installed
  `@angular/forms/types/signals.d.ts` and compiled `signals.mjs` (confirming `form()`,
  `submit()`, `required()`, `min()`, and the `[formField]` selector) rather than
  guessing from the rule file's prose description alone.
- **Search input**: implemented as a plain signal + `(input)` binding rather than a
  Signal Forms field, since the search box isn't part of a submitted form — the rule
  file's "don't manually bind `(input)` on a `[formField]`-applied field" restriction
  only applies to fields that are part of a Signal Forms `FieldTree`, which the search
  box isn't.
- **State service scope**: provided `ProductsState` at the route level (`products.routes.ts`
  → `providers: [ProductsState]`) rather than `providedIn: 'root'`, per `state.md`'s
  guidance to scope feature state to where it's used unless genuinely app-wide.
- **Route protection**: wrapped the `products` route with `authGuard` since this is a
  `basic-auth` project and there's no indication this feature should be publicly
  accessible; this is a judgment call, not something explicitly stated in the feature
  spec.
- **Delete confirmation copy**: used Transloco's `translate()` (not the `t` pipe, since
  this is imperative code inside a click handler, not a template) with an interpolated
  `{{name}}` param, to keep the confirm-dialog string translatable per `i18n.md`, rather
  than hardcoding an English string as the fully-specified task description's literal
  wording might have implied.

## Anything else worth flagging

- `npm install` (run by `generate.js` itself) printed `EBADENGINE` warnings for
  `lint-staged@17.0.8` and `listr2@10.2.2`, both wanting Node ≥22.13–22.22 while this
  machine runs v20.20.2. Husky/lint-staged still installed and ran successfully during
  the initial generation commit, so this appears to be a soft warning rather than a
  real breakage — flagging in case it becomes a hard failure on a stricter npm/Node
  combination.
- The `whenStable()`/zoneless/mock-delay interaction (described above) is the only
  real friction encountered while building the feature itself; everything else
  (routing, state, Signal Forms, Tailwind tokens, Transloco) worked exactly as the rule
  files described on the first attempt.
