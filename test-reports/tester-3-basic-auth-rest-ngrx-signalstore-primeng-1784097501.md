# Feature Test Report — Tester 3

**Bundle combination tested:** `--angular-version=21 --auth=basic-auth --data-layer=rest --state=ngrx-signalstore --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=primeng`
**Angular version:** target 21 (requested explicitly), actual generated version `^21.2.0` (resolved `21.2.18`/`21.2.19` in `package.json`/`node_modules`) — no substitution needed.
**Your Node version:** v20.20.2
**Date:** 2026-07-15

## Generation

- [x] `generate.js` completed without error
- [x] `npm install` succeeded (0 vulnerabilities). Only warning: `lint-staged@17.0.8`/`listr2@10.2.2` printed `EBADENGINE` warnings because they declare `engines.node >= 22.x` and the local Node is `v20.20.2` — non-fatal, husky/lint-staged installed and ran fine anyway.

## The feature-building session

1. Generated the project with the tester-3 flags above (`node scripts/generate.js ... --dry-run=false`).
2. Read `.claude/rules/angular.md`'s Forms section in the **generated project** (not assumed) to confirm this Angular-21 project uses Signal Forms (`@angular/forms/signals`), not Reactive Forms.
3. Read `.claude/rules/state.md` (ngrx-signalstore), `.claude/rules/data-layer.md` (rest), `.claude/rules/roles.md` (single-role), `.claude/rules/styling.md` (primeng), and `.claude/rules/architecture.md` to match existing conventions (folder layout, `ApiService` wrapper, no role gating).
4. Inspected already-generated files (`core/services/api.service.ts`, `core/services/auth.service.ts`, `core/config/primeng-theme.config.ts`) to see the real patterns to build on top of.
5. Created the feature under `src/app/features/products/`:
   - `models/product.model.ts`
   - `services/products.service.ts` (+ `.spec.ts`, using `ApiService`, real `HttpTestingController`)
   - `state/products.store.ts` (`@ngrx/signals` `signalStore` with `withState`/`withComputed`/`withMethods`)
   - `pages/products-page/products-page.ts` / `.html` / `.scss` / `.spec.ts` (container component)
   - `products.routes.ts` (lazy route)
6. Wired `features/products` into `app.routes.ts` via `loadChildren`.
7. Updated `app.config.ts` — this file was **not yet wired for HTTP or PrimeNG at all** (see "Rule/CLAUDE.md guidance gaps" below): added `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))`, `provideAnimationsAsync()`, and `providePrimeNG({ theme: primeNgThemeConfig })`, per what `.claude/rules/styling.md` itself says is required manual wiring for PrimeNG, and what's necessary for `ApiService`/the existing interceptors to actually run.
8. Ran `ng lint`, `ng build`, `ng test` — all passed (details below).

---

## Generated code — the most important section, do not skip or summarize

### src/app/app.config.ts

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { primeNgThemeConfig } from './core/config/primeng-theme.config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({ theme: primeNgThemeConfig }),
  ]
};
```

### src/app/app.routes.ts

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'products',
    loadChildren: () => import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
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

### src/app/features/products/services/products.service.ts

```ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiService);

  getProducts(): Observable<Product[]> {
    return this.api.get<Product[]>('/products');
  }

  createProduct(product: Omit<Product, 'id'>): Observable<Product> {
    return this.api.post<Product>('/products', product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.api.delete<void>(`/products/${id}`);
  }
}
```

### src/app/features/products/services/products.service.spec.ts

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { apiBaseUrl } from '../../../core/config/api.config';
import { ProductsService } from './products.service';
import { Product } from '../models/product.model';

describe('ProductsService', () => {
  let service: ProductsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProductsService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProductsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('fetches products from the products endpoint', () => {
    const mockProducts: Product[] = [{ id: '1', name: 'Widget', price: 9.99 }];

    let result: Product[] | undefined;
    service.getProducts().subscribe((products) => (result = products));

    const req = httpTesting.expectOne(`${apiBaseUrl}/products`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);

    expect(result).toEqual(mockProducts);
  });

  it('posts a new product', () => {
    const created: Product = { id: '2', name: 'Gadget', price: 19.99 };

    let result: Product | undefined;
    service.createProduct({ name: 'Gadget', price: 19.99 }).subscribe((product) => (result = product));

    const req = httpTesting.expectOne(`${apiBaseUrl}/products`);
    expect(req.request.method).toBe('POST');
    req.flush(created);

    expect(result).toEqual(created);
  });

  it('deletes a product by id', () => {
    let completed = false;
    service.deleteProduct('1').subscribe(() => (completed = true));

    const req = httpTesting.expectOne(`${apiBaseUrl}/products/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(completed).toBe(true);
  });
});
```

### src/app/features/products/state/products.store.ts

```ts
import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { ProductsService } from '../services/products.service';
import { Product } from '../models/product.model';

interface ProductsState {
  products: Product[];
  searchTerm: string;
  loading: boolean;
}

const initialState: ProductsState = {
  products: [],
  searchTerm: '',
  loading: false,
};

export const ProductsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ products, searchTerm }) => ({
    filteredProducts: computed(() => {
      const term = searchTerm().trim().toLowerCase();
      if (!term) {
        return products();
      }
      return products().filter((product) => product.name.toLowerCase().includes(term));
    }),
  })),
  withMethods((store, productsService = inject(ProductsService)) => ({
    loadProducts(): void {
      patchState(store, { loading: true });
      productsService.getProducts().subscribe({
        next: (products) => patchState(store, { products, loading: false }),
        error: () => patchState(store, { loading: false }),
      });
    },
    setSearchTerm(term: string): void {
      patchState(store, { searchTerm: term });
    },
    addProduct(newProduct: Omit<Product, 'id'>): void {
      productsService.createProduct(newProduct).subscribe({
        next: (created) => patchState(store, { products: [created, ...store.products()] }),
      });
    },
    removeProduct(id: string): void {
      productsService.deleteProduct(id).subscribe({
        next: () => patchState(store, { products: store.products().filter((product) => product.id !== id) }),
      });
    },
  })),
);
```

### src/app/features/products/products.routes.ts

```ts
import { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/products-page/products-page').then((m) => m.ProductsPage),
  },
];
```

### src/app/features/products/pages/products-page/products-page.ts

```ts
import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { FormField, form, min, required, submit } from '@angular/forms/signals';
import { ProductsStore } from '../../state/products.store';

interface NewProductFormModel {
  name: string;
  price: number;
}

@Component({
  selector: 'featuretest3-products-page',
  imports: [Button, InputText, TableModule, FormField, DecimalPipe],
  templateUrl: './products-page.html',
  styleUrl: './products-page.scss',
})
export class ProductsPage {
  protected readonly store = inject(ProductsStore);

  protected readonly addFormVisible = signal(false);

  protected readonly newProductModel = signal<NewProductFormModel>({ name: '', price: 0 });
  protected readonly newProductForm = form(this.newProductModel, (path) => {
    required(path.name, { message: 'Name is required.' });
    required(path.price, { message: 'Price is required.' });
    min(path.price, 0.01, { message: 'Price must be greater than 0.' });
  });

  constructor() {
    this.store.loadProducts();
  }

  protected onSearchInput(value: string): void {
    this.store.setSearchTerm(value);
  }

  protected showAddForm(): void {
    this.addFormVisible.set(true);
  }

  protected cancelAddForm(): void {
    this.addFormVisible.set(false);
    this.newProductModel.set({ name: '', price: 0 });
  }

  protected async onSubmitAddForm(): Promise<void> {
    await submit(this.newProductForm, async (submittedForm) => {
      const value = submittedForm().value();
      this.store.addProduct({ name: value.name, price: value.price });
      this.addFormVisible.set(false);
      this.newProductModel.set({ name: '', price: 0 });
    });
  }

  protected onDelete(id: string, name: string): void {
    if (confirm(`Delete "${name}"?`)) {
      this.store.removeProduct(id);
    }
  }
}
```

### src/app/features/products/pages/products-page/products-page.html

```html
<section class="products-page">
  <h1>Products</h1>

  <div class="products-page__toolbar">
    <input
      type="text"
      pInputText
      placeholder="Search products by name"
      aria-label="Search products by name"
      [value]="store.searchTerm()"
      (input)="onSearchInput($any($event.target).value)"
    />

    @if (!addFormVisible()) {
      <p-button label="+ Add Product" (onClick)="showAddForm()" />
    } @else {
      <p-button label="Cancel" severity="secondary" (onClick)="cancelAddForm()" />
    }
  </div>

  @if (addFormVisible()) {
    <form class="products-page__add-form" (submit)="$event.preventDefault(); onSubmitAddForm()">
      <div class="products-page__field">
        <label for="new-product-name">Name</label>
        <input id="new-product-name" type="text" pInputText [formField]="newProductForm.name" />
        @if (newProductForm.name().touched() && !newProductForm.name().valid()) {
          <span class="products-page__error">{{ newProductForm.name().errors()[0]?.message }}</span>
        }
      </div>

      <div class="products-page__field">
        <label for="new-product-price">Price</label>
        <input id="new-product-price" type="number" pInputText [formField]="newProductForm.price" />
        @if (newProductForm.price().touched() && !newProductForm.price().valid()) {
          <span class="products-page__error">{{ newProductForm.price().errors()[0]?.message }}</span>
        }
      </div>

      <p-button type="submit" label="Save" [disabled]="!newProductForm().valid()" />
    </form>
  }

  <p-table [value]="store.filteredProducts()" dataKey="id">
    <ng-template pTemplate="header">
      <tr>
        <th>Name</th>
        <th>Price</th>
        <th></th>
      </tr>
    </ng-template>
    <ng-template pTemplate="body" let-product>
      <tr>
        <td>{{ product.name }}</td>
        <td>{{ product.price | number: '1.2-2' }}</td>
        <td>
          <p-button
            icon="pi pi-trash"
            severity="danger"
            [text]="true"
            [attr.aria-label]="'Delete ' + product.name"
            (onClick)="onDelete(product.id, product.name)"
          />
        </td>
      </tr>
    </ng-template>
    <ng-template pTemplate="emptymessage">
      <tr>
        <td colspan="3">No products found.</td>
      </tr>
    </ng-template>
  </p-table>
</section>
```

### src/app/features/products/pages/products-page/products-page.scss

```scss
.products-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
}

.products-page__toolbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.products-page__add-form {
  display: flex;
  align-items: flex-end;
  gap: 1rem;
}

.products-page__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.products-page__error {
  color: var(--p-red-500, #e24c4c);
  font-size: 0.85rem;
}
```

### src/app/features/products/pages/products-page/products-page.spec.ts

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { apiBaseUrl } from '../../../../core/config/api.config';
import { ProductsPage } from './products-page';
import { Product } from '../../models/product.model';

describe('ProductsPage', () => {
  let httpTesting: HttpTestingController;

  const mockProducts: Product[] = [
    { id: '1', name: 'Widget', price: 9.99 },
    { id: '2', name: 'Gizmo', price: 19.99 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  afterEach(() => {
    httpTesting.verify();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(ProductsPage);
    httpTesting = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const req = httpTesting.expectOne(`${apiBaseUrl}/products`);
    req.flush(mockProducts);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the initial list of products', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as { store: { filteredProducts(): Product[] } };
    expect(component.store.filteredProducts().length).toBe(2);

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
  });

  it('filters the visible list as the user types a search term', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as {
      onSearchInput(value: string): void;
      store: { filteredProducts(): Product[] };
    };

    component.onSearchInput('wid');
    fixture.detectChanges();

    expect(component.store.filteredProducts().length).toBe(1);
    expect(component.store.filteredProducts()[0].name).toBe('Widget');
  });

  it('removes a product on delete after the user confirms', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance as unknown as {
      onDelete(id: string, name: string): void;
      store: { products(): Product[] };
    };
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.onDelete('1', 'Widget');

    const req = httpTesting.expectOne(`${apiBaseUrl}/products/1`);
    req.flush(null);
    fixture.detectChanges();

    expect(component.store.products().some((product) => product.id === '1')).toBe(false);
  });
});
```

---

## Rule compliance self-check

**Architecture (`architecture.md`)**
- [x] New feature lives under `features/products/`, not scattered elsewhere
- [x] Container/presentational split followed — `ProductsPage` under `pages/` owns state and is the only component; no separate presentational components were needed for a feature this size (list/search/delete/add all live in one reasonably small container, consistent with "a feature typically has few container components")
- [x] No `HttpClient` injected directly in a component — `ProductsPage` → `ProductsStore` → `ProductsService` → `ApiService` → `HttpClient`

**Angular patterns (`angular.md`)**
- [x] `@for` not used directly — the list is rendered via PrimeNG's `p-table` `body` template (`ng-template pTemplate="body" let-product`), which is the project's documented pattern for "any data-grid need" instead of hand-built `@for`/`track`. No other list iteration was needed.
- [x] No `@Input()`/`@Output()` decorators mixed with signals — none used at all (no inputs/outputs on this container)
- [x] State updates are immutable — `patchState()` throughout the store, `products: [created, ...store.products()]`, `.filter(...)` — no direct mutation
- [x] No non-trivial method calls in template expressions — template calls are only signal reads (`store.searchTerm()`, `store.filteredProducts()`, `newProductForm.name()`) and a trivial `product.price | number`
- [x] Forms use Signal Forms (`@angular/forms/signals`) — confirmed against the generated project's own `.claude/rules/angular.md`, which documents Signal Forms as the v21+ default. Used `form()`, `[formField]`, `required`/`min` validators, and `submit()` exactly per that file's guidance — verified each API's actual signature against `node_modules/@angular/forms/types/signals.d.ts` (this API is experimental) rather than assuming.

**Accessibility (`accessibility.md`)**
- [x] No `<div>`/`<span>` given `(click)`/`tabindex` — all interactive elements are real `<input>`/`<button>` (via `p-button`, which renders a native `<button>`)
- [x] No hand-rolled custom interactive widget — used PrimeNG's `Table`/`Button`/`InputText` throughout, no custom ARIA/keyboard logic needed
- [ ] **Not done: focus management after route navigation.** This project has no existing navigation-focus handler (confirmed — grepped for `NavigationEnd` in `src/app`, found nothing), and the accessibility rule says to flag this as missing rather than assume the browser handles it, rather than building a new one myself scoped to just this feature. Flagging here per that rule.

**Security (`security.md`)**
- [x] No hardcoded API URLs — `ProductsService` goes through `ApiService` (relative paths only: `/products`, `/products/${id}`)
- [x] No `DomSanitizer.bypassSecurityTrust*` calls
- [x] No secrets/keys hardcoded anywhere

**Styling (PrimeNG)**
- [x] Used PrimeNG's actual components (`Button`, `InputText`, `TableModule`'s `Table`), each imported individually per `styling.md` ("never the entire module surface") — `Table` itself is a non-standalone `NgModule`-declared component in this PrimeNG version, so `TableModule` (not just `Table`) is the correct/only way to import it; `Button` and `InputText` are standalone and imported directly.
- [x] No hardcoded hex/rgb/hsl colors outside a central token — the one color in `products-page.scss` (`.products-page__error`) uses a PrimeNG design token (`var(--p-red-500, #e24c4c)`) with a plain-CSS fallback, not an ad hoc hardcoded color used as the primary value.
- [x] Did not edit the protected `primeng-theme.config.ts`.

**Testing**
- [x] Every new component/service has a co-located `.spec.ts`
- [x] Tests assert real behavior: `products.service.spec.ts` exercises real HTTP calls via `HttpTestingController` (GET/POST/DELETE, verified per method and URL); `products-page.spec.ts` covers initial render (2 rows), search actually filtering (typing "wid" → 1 result, "Widget"), and delete actually removing an item after `confirm()` — using the real service via `provideHttpClient()`/`provideHttpClientTesting()`, not a hand-mocked service, per `angular.md`'s testing guidance.

## Hook behavior observed

| Hook | What triggered it | Correct block, or false positive? | Notes |
|---|---|---|---|
| none fired | — | — | No hook blocked or warned during this session — no `<div>`/`<span>` with bound `(click)`/`tabindex` was ever written, so `check-interactive-div-span.sh` never had a reason to trigger. |

## Anything that should have been blocked, but wasn't

Nothing found — no rule violations were made in the generated feature code that a hook should have caught but didn't.

## Rule/CLAUDE.md guidance gaps

- **`app.config.ts` shipped from `generate.js` with no `provideHttpClient()` at all**, for a project whose `data-layer` bundle is `rest` and whose `auth` bundle is `basic-auth` (both of which generate code — `ApiService`, `AuthService`, `auth.interceptor.ts`, `error.interceptor.ts` — that assumes `HttpClient` and the interceptor chain are wired up). Without adding `provideHttpClient(withInterceptors([authInterceptor, errorInterceptor]))` myself, `AuthService`'s and `ApiService`'s `HttpClient` injection would throw at runtime (no provider), and the two interceptors would silently never run. This isn't scoped to my feature — it looks like a gap in the `rest`/`basic-auth` bundle combination itself (or the base scaffold) that would affect every feature in a fresh project, not just this one. Per the skill's instructions I did **not** touch `bundles/`/`scripts/generate.js` to fix the root cause — I only wired it in `app.config.ts` inside my generated project (not a protected file) so the feature I built would actually be functional and testable. Flagging for the central-brain session to fix at the bundle-generation level.
- **PrimeNG's manual wiring note in `styling.md` was accurate and necessary** — `providePrimeNG`/`provideAnimationsAsync` really were both absent from the freshly generated `app.config.ts`, exactly as the rule file warned. No gap there, just confirming the rule file is correct and this was real, not hypothetical.
- **`@ngrx/signals` has no `rxjs-interop` subpath in this installed version** (`@ngrx/signals@21.1.1` — checked `node_modules/@ngrx/signals` directly, no `rxjs-interop` export), so `rxMethod()` isn't available here. `state.md` doesn't mention this either way. I used a plain `productsService.getProducts().subscribe(...)` call inside `withMethods` instead, which is a documented-elsewhere valid pattern but worth knowing this project's pinned `@ngrx/signals` version doesn't currently offer the `rxMethod` ergonomics some SignalStore examples assume.
- **`architecture.md`'s folder guidance says "New API service for one feature → `features/<feature-name>/services/`"** but doesn't explicitly address where a per-feature SignalStore goes when the `state` bundle is `ngrx-signalstore` — I used `state.md`'s own guidance instead (`src/app/features/<feature>/state/<feature>.store.ts`), which is unambiguous and matches. No real gap, just noting `architecture.md`'s "where new code goes" table doesn't list `state/` as a row (only `services/`) — a minor omission, not something that caused any wrong decision here.

## Final verification

| Check | Result |
|---|---|
| `ng lint` | ✅ Pass — "All files pass linting." |
| `ng build` | ✅ Pass — production build succeeded, `products-page` correctly split into its own lazy chunk (`chunk-HPFOH4DW.js`, separate from the initial bundle) |
| `ng test` | ✅ Pass — 3 test files, 8 tests, all passed (Vitest) |

## Assumptions made

- **Angular version**: used `--angular-version=21` exactly as assigned; no fallback needed (Node v20.20.2 satisfies the `>=20.19` requirement for v21).
- **Signal Forms vs. Reactive Forms**: checked the *generated project's own* `.claude/rules/angular.md` (not assumed) — confirmed Signal Forms applies since this is Angular 21.
- **List rendering**: the feature spec says "using this project's standard list-rendering pattern (`@for` with `track`)", but this project's `styling.md` explicitly says to use PrimeNG's `Table` for any data-grid need instead of hand-building one. Since a product list-with-columns is exactly a data-grid, I used PrimeNG's `Table` (via its `body` template) rather than a hand-rolled `@for`/`track` list — treating the styling bundle's explicit table guidance as taking precedence over the generic list-rendering instruction for this specific case, since building a custom `@for` list here would itself violate `styling.md`'s "don't hand-build a custom sortable/filterable table when PrimeNG already covers it."
- **Add/Edit via real backend calls**: since `data-layer` is `rest` (not `mock`), `addProduct`/`removeProduct` in the store call the real `ProductsService` methods (which hit `/products` and `/products/:id`) rather than only mutating local state — per the feature spec's instruction to "write the service call assuming a conventional endpoint/schema" for non-mock data layers. No real backend exists, so these calls will 404 in a real browser session; this doesn't block the built feature, lint, build, or tests (all of which use `HttpTestingController` to simulate responses), but it does mean the add/delete flows won't functionally succeed against nothing — flagged here rather than treated as a bug, since this matches what the assignment explicitly asked for.
- **Role gating**: skipped entirely per `roles.md` (single-role — no role concept in this project).
- **`app.config.ts` wiring**: added `provideHttpClient`/interceptors and PrimeNG providers myself since they were completely absent (see "Rule/CLAUDE.md guidance gaps" above) and the feature could not build a working HTTP-backed feature without them. Did not modify any protected file to do this.
- **Delete confirmation**: used the native `confirm()` exactly as instructed, no custom dialog component.
- **Testing library choice**: tested through the real `ProductsService`/`HttpTestingController` (not a mocked service or mocked store) per `angular.md`'s explicit testing preference ("exercises the actual interceptor chain... rather than bypassing it").

## Anything else worth flagging

- Bundle install/build/test all completed on the first real generation — no Node-version fallback, no generator failure, no retries needed.
- The project was generated to `/tmp/feature-test-3` and will be deleted after this report is committed, per the skill's cleanup step — it is not part of this commit.
