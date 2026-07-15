# Feature Test Report — Tester 6

**Bundle combination tested:** `--auth=none --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none --e2e=none`
**Angular version:** requested "latest" (no `--angular-version` flag). Fell back through 22 → 21 → 20 → **19** — actual generated version **Angular 19.2.0**. Node v20.11.1 is below the minimum every current Angular CLI wants (see Assumptions).
**Your Node version:** v20.11.1
**Date:** 2026-07-15

## Generation

- [x] `generate.js` completed without error (on the Angular 19 fallback attempt — see below and Assumptions)
- [x] `npm install` succeeded — completed with EBADENGINE warnings (many transitive npm/CLI packages want Node `^20.17`/`>=20.19`/`>=22`, while this machine is on v20.11.1) plus the usual `npm audit` vulnerability summary (28 vulnerabilities reported). Non-fatal; dependencies installed and the app builds/tests clean.

**Important:** the generator's own final step (`git init` + initial commit) **failed**, but *after* all scaffolding, base-layer, bundle application, and `npm install` had completed successfully. The commit failed because the husky pre-commit hook runs `lint-staged`, whose `listr2` dependency does `import { styleText } from 'node:util'` — an export that only exists in Node ≥20.19. On Node v20.11.1 this throws `SyntaxError: ... does not provide an export named 'styleText'` and the pre-commit hook exits 1, failing the commit. This is purely the generator's *own* bootstrap commit; the generated project on disk is complete and fully functional (lint/build/test all pass). See "Rule/CLAUDE.md guidance gaps".

## The feature-building session

Order of what Claude Code did:

1. Read the environment: Node v20.11.1, confirmed existing reports for testers 1–4.
2. First generation attempt failed on a **new required axis**: `--e2e=<option>` is now mandatory but is not in this skill's assignment table (the table predates commit e9abcaa which added the e2e axis). Picked `--e2e=none` (conservative — avoids the Playwright installer, and matches this bundle's "minimal" character). See Assumptions.
3. Generation then failed on Node version: latest CLI (Angular 22) requires Node ≥22.22.3. Fell back explicitly through `--angular-version=21` (needs ≥20.19 — fails), `=20` (needs ≥20.19 — fails), to `=19`, which scaffolded and installed successfully.
4. Read the project's guardrails before writing any code: `.claude/rules/angular.md` (confirmed **Reactive Forms** for Angular 19 — Signal Forms doesn't exist pre-v21), `architecture.md`, `data-layer.md` (REST via shared `ApiService`), `state.md` (signals-only), `styling.md` (plain SCSS + central color tokens), `roles.md` (single-role → **no** role gating), plus `.claude/settings.json` and the relevant hooks.
5. Created the feature under `src/app/features/products/`:
   - `models/product.model.ts` — `Product` + `NewProduct`.
   - `services/products.service.ts` — REST calls via injected `ApiService`.
   - `services/products.state.ts` — signals-only state (products, search term, loading) with a `computed()` filtered list; read-only exposure via `asReadonly()`/`computed()`.
   - `pages/product-list/product-list.component.{ts,html,scss}` — single container component: list, reactive search input, native-`confirm()` delete, and a toggleable Reactive-Forms add form.
   - `products.routes.ts` — lazy route, `ProductsState` provided at feature-route level.
   - Updated `app.routes.ts` to lazy-load `products`.
   - Added central color tokens to `src/styles.scss` (component SCSS references them via `var(--…)`).
   - Spec files for the service, the state service, and the component.
6. Verified: `ng lint` (pass), `ng build` (pass), `ng test` (initially 13/16 failed on a zoneless test-config issue → fixed → **16/16 pass**). See Final verification + hook table.

---

## Generated code — the most important section, do not skip or summarize

### src/app/app.routes.ts

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'products',
    loadChildren: () =>
      import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
  },
];
```

### src/app/features/products/products.routes.ts

```ts
import { Routes } from '@angular/router';

import { ProductsState } from './services/products.state';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    // Feature-scoped state: one ProductsState per visit to the products feature.
    providers: [ProductsState],
    loadComponent: () =>
      import('./pages/product-list/product-list.component').then((m) => m.ProductListComponent),
  },
];
```

### src/app/features/products/models/product.model.ts

```ts
/**
 * A product in the catalogue. Matches the shape returned by the REST
 * `/products` endpoint (see products.service.ts).
 */
export interface Product {
  id: string;
  name: string;
  price: number;
}

/** Shape submitted when creating a product — the backend assigns the `id`. */
export type NewProduct = Omit<Product, 'id'>;
```

### src/app/features/products/services/products.service.ts

```ts
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { NewProduct, Product } from '../models/product.model';

/**
 * Feature-specific REST access for products. Built on top of the shared
 * `ApiService` (never `HttpClient` directly) so the base URL and request shape
 * stay consistent app-wide — see .claude/rules/data-layer.md.
 */
@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiService);
  private readonly resource = '/products';

  getProducts(): Observable<Product[]> {
    return this.api.get<Product[]>(this.resource);
  }

  createProduct(product: NewProduct): Observable<Product> {
    return this.api.post<Product>(this.resource, product);
  }

  deleteProduct(id: string): Observable<void> {
    return this.api.delete<void>(`${this.resource}/${id}`);
  }
}
```

### src/app/features/products/services/products.state.ts

```ts
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { NewProduct, Product } from '../models/product.model';
import { ProductsService } from './products.service';

/**
 * Signals-only state for the products feature (see .claude/rules/state.md).
 * Holds the loaded products plus the current search term, and exposes derived
 * state read-only via `computed()`/`asReadonly()`. All mutation goes through
 * named methods so callers can't bypass the service's data flow.
 *
 * Provided at the feature-route level (not `providedIn: 'root'`) so its
 * lifetime is scoped to the products feature.
 */
@Injectable()
export class ProductsState {
  private readonly service = inject(ProductsService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _products = signal<Product[]>([]);
  private readonly _searchTerm = signal('');
  private readonly _loading = signal(false);

  /** Current search term (read-only view). */
  readonly searchTerm = this._searchTerm.asReadonly();

  /** Whether the initial product load is in flight. */
  readonly loading = this._loading.asReadonly();

  /** Products filtered by a case-insensitive substring match on `name`. */
  readonly filteredProducts = computed(() => {
    const term = this._searchTerm().trim().toLowerCase();
    const all = this._products();
    if (!term) {
      return all;
    }
    return all.filter((product) => product.name.toLowerCase().includes(term));
  });

  /** Fetch the product list from the REST backend. */
  load(): void {
    this._loading.set(true);
    this.service
      .getProducts()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (products) => {
          this._products.set(products);
          this._loading.set(false);
        },
        error: () => {
          this._loading.set(false);
        },
      });
  }

  /** Update the reactive search term. */
  setSearchTerm(term: string): void {
    this._searchTerm.set(term);
  }

  /** Create a product and prepend it to the list on success. */
  addProduct(product: NewProduct): void {
    this.service
      .createProduct(product)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => this._products.update((list) => [created, ...list]),
      });
  }

  /** Delete a product and remove it from the list on success. */
  removeProduct(id: string): void {
    this.service
      .deleteProduct(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this._products.update((list) => list.filter((product) => product.id !== id)),
      });
  }
}
```

### src/app/features/products/pages/product-list/product-list.component.ts

```ts
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { Product } from '../../models/product.model';
import { ProductsState } from '../../services/products.state';

/** App-specific rule: price must be strictly greater than zero. */
export function positivePrice(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'number' && value > 0 ? null : { positivePrice: true };
}

/**
 * Container component for the products feature: owns the interaction with
 * `ProductsState`, renders the list, and hosts the search + add-product forms.
 */
@Component({
  selector: 'featuretest6-product-list',
  imports: [ReactiveFormsModule, CurrencyPipe],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent {
  private readonly state = inject(ProductsState);
  private readonly destroyRef = inject(DestroyRef);

  readonly products = this.state.filteredProducts;
  readonly loading = this.state.loading;

  /** Whether the add-product form is currently shown. */
  readonly showAddForm = signal(false);

  readonly searchControl = new FormControl('', { nonNullable: true });

  readonly addForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    price: new FormControl<number | null>(null, {
      validators: [Validators.required, positivePrice],
    }),
  });

  constructor() {
    this.state.load();
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => this.state.setSearchTerm(term));
  }

  toggleAddForm(): void {
    this.showAddForm.update((shown) => !shown);
    if (!this.showAddForm()) {
      this.addForm.reset();
    }
  }

  addProduct(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const { name, price } = this.addForm.getRawValue();
    this.state.addProduct({ name: name.trim(), price: price as number });
    this.addForm.reset();
    this.showAddForm.set(false);
  }

  deleteProduct(product: Product): void {
    if (confirm(`Delete "${product.name}"?`)) {
      this.state.removeProduct(product.id);
    }
  }
}
```

### src/app/features/products/pages/product-list/product-list.component.html

```html
<section class="products">
  <h1>Products</h1>

  <div class="toolbar">
    <input
      type="text"
      class="search"
      [formControl]="searchControl"
      placeholder="Search products by name"
      aria-label="Search products by name"
    />
    <button type="button" class="toggle" (click)="toggleAddForm()">
      {{ showAddForm() ? 'Cancel' : '+ Add Product' }}
    </button>
  </div>

  @if (showAddForm()) {
    <form class="add-form" [formGroup]="addForm" (ngSubmit)="addProduct()">
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

      <button type="submit" class="save" [disabled]="addForm.invalid">Save</button>
    </form>
  }

  @if (loading()) {
    <p class="status">Loading products…</p>
  } @else if (products().length === 0) {
    <p class="status empty">No products found.</p>
  } @else {
    <ul class="product-list">
      @for (product of products(); track product.id) {
        <li class="product-row">
          <span class="name">{{ product.name }}</span>
          <span class="price">{{ product.price | currency }}</span>
          <button
            type="button"
            class="delete"
            [attr.aria-label]="'Delete ' + product.name"
            (click)="deleteProduct(product)"
          >
            Delete
          </button>
        </li>
      }
    </ul>
  }
</section>
```

### src/app/features/products/pages/product-list/product-list.component.scss

```scss
.products {
  max-width: 640px;
  margin: 0 auto;
  padding: 1.5rem;
  color: var(--color-text);
}

h1 {
  margin-bottom: 1rem;
}

.toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.search {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

button {
  padding: 0.5rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.toggle {
  white-space: nowrap;
}

.add-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-subtle);

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  input {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }
}

.error {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-danger);
}

.status {
  color: var(--color-muted);
}

.product-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.product-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-border);

  .name {
    flex: 1;
    font-weight: 600;
  }

  .price {
    color: var(--color-muted);
  }

  .delete {
    color: var(--color-danger);
  }
}
```

### src/styles.scss (changed — central color tokens added)

```scss
/* You can add global styles to this file, and also import other style files */

/* Central design tokens. Component styles reference these via var(--…) rather
   than hardcoding color literals (see .claude/hooks/check-hardcoded-colors.sh). */
:root {
  --color-text: #1a1a1a;
  --color-muted: #6b7280;
  --color-border: #d1d5db;
  --color-danger: #b91c1c;
  --color-surface: #ffffff;
  --color-surface-subtle: #f9fafb;
}
```

### src/app/features/products/services/products.service.spec.ts

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Product } from '../models/product.model';
import { ProductsService } from './products.service';

const API = 'https://api.example.com/products';

describe('ProductsService', () => {
  let service: ProductsService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductsService,
        provideExperimentalZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ProductsService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('GETs the product list', () => {
    const mock: Product[] = [{ id: '1', name: 'Widget', price: 1 }];
    let result: Product[] | undefined;
    service.getProducts().subscribe((products) => (result = products));

    const req = httpTesting.expectOne(API);
    expect(req.request.method).toBe('GET');
    req.flush(mock);

    expect(result).toEqual(mock);
  });

  it('POSTs a new product', () => {
    const created: Product = { id: '10', name: 'Gadget', price: 2 };
    let result: Product | undefined;
    service.createProduct({ name: 'Gadget', price: 2 }).subscribe((product) => (result = product));

    const req = httpTesting.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Gadget', price: 2 });
    req.flush(created);

    expect(result).toEqual(created);
  });

  it('DELETEs a product by id', () => {
    let completed = false;
    service.deleteProduct('7').subscribe(() => (completed = true));

    const req = httpTesting.expectOne(`${API}/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    expect(completed).toBe(true);
  });
});
```

### src/app/features/products/services/products.state.spec.ts

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Product } from '../models/product.model';
import { ProductsState } from './products.state';

const API = 'https://api.example.com/products';

const MOCK: Product[] = [
  { id: '1', name: 'Alpha Widget', price: 9.99 },
  { id: '2', name: 'Beta Gadget', price: 19.5 },
];

describe('ProductsState', () => {
  let state: ProductsState;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductsState,
        provideExperimentalZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    state = TestBed.inject(ProductsState);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function load(products: Product[] = MOCK): void {
    state.load();
    httpTesting.expectOne(API).flush(products);
  }

  it('loads products and clears the loading flag', () => {
    state.load();
    expect(state.loading()).toBe(true);
    httpTesting.expectOne(API).flush(MOCK);
    expect(state.loading()).toBe(false);
    expect(state.filteredProducts()).toEqual(MOCK);
  });

  it('filters by a case-insensitive substring of the name', () => {
    load();
    state.setSearchTerm('alpha');
    expect(state.filteredProducts()).toEqual([MOCK[0]]);

    state.setSearchTerm('');
    expect(state.filteredProducts().length).toBe(2);
  });

  it('prepends a created product', () => {
    load();
    state.addProduct({ name: 'Zeta', price: 3 });
    httpTesting.expectOne(API).flush({ id: '99', name: 'Zeta', price: 3 });

    expect(state.filteredProducts()[0]).toEqual({ id: '99', name: 'Zeta', price: 3 });
    expect(state.filteredProducts().length).toBe(3);
  });

  it('removes a deleted product', () => {
    load();
    state.removeProduct('1');
    httpTesting.expectOne(`${API}/1`).flush(null);

    expect(state.filteredProducts().length).toBe(1);
    expect(state.filteredProducts()[0].id).toBe('2');
  });
});
```

### src/app/features/products/pages/product-list/product-list.component.spec.ts

```ts
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Product } from '../../models/product.model';
import { ProductsState } from '../../services/products.state';
import { ProductListComponent } from './product-list.component';

const API = 'https://api.example.com/products';

const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'Alpha Widget', price: 9.99 },
  { id: '2', name: 'Beta Gadget', price: 19.5 },
  { id: '3', name: 'Gamma Gizmo', price: 4.25 },
];

describe('ProductListComponent', () => {
  let fixture: ComponentFixture<ProductListComponent>;
  let component: ProductListComponent;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ProductListComponent],
      // ProductsState is feature-scoped (not providedIn: 'root'), so provide it here.
      // Zoneless project (see app.config.ts) — TestBed needs the same CD provider.
      providers: [
        ProductsState,
        provideExperimentalZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    fixture = TestBed.createComponent(ProductListComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  /** Flush the initial GET /products issued by the component's constructor. */
  function flushInitialLoad(products: Product[] = MOCK_PRODUCTS): void {
    fixture.detectChanges();
    const req = httpTesting.expectOne(API);
    expect(req.request.method).toBe('GET');
    req.flush(products);
    fixture.detectChanges();
  }

  function rowCount(): number {
    return fixture.nativeElement.querySelectorAll('.product-row').length;
  }

  it('renders all products on initial load', () => {
    flushInitialLoad();
    expect(rowCount()).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Alpha Widget');
    expect(fixture.nativeElement.textContent).toContain('Beta Gadget');
  });

  it('filters the visible list by name (case-insensitive) as the user types', () => {
    flushInitialLoad();

    component.searchControl.setValue('GADGET');
    fixture.detectChanges();

    expect(rowCount()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Beta Gadget');
    expect(fixture.nativeElement.textContent).not.toContain('Alpha Widget');
  });

  it('removes a product from the list when deletion is confirmed', () => {
    flushInitialLoad();
    spyOn(window, 'confirm').and.returnValue(true);

    component.deleteProduct(MOCK_PRODUCTS[0]);

    const req = httpTesting.expectOne(`${API}/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
    fixture.detectChanges();

    expect(rowCount()).toBe(2);
    expect(fixture.nativeElement.textContent).not.toContain('Alpha Widget');
  });

  it('does not delete when the confirmation is cancelled', () => {
    flushInitialLoad();
    spyOn(window, 'confirm').and.returnValue(false);

    component.deleteProduct(MOCK_PRODUCTS[0]);

    httpTesting.expectNone(`${API}/1`);
    expect(rowCount()).toBe(3);
  });

  it('adds a valid new product to the top of the list on submit', () => {
    flushInitialLoad();

    component.showAddForm.set(true);
    component.addForm.setValue({ name: 'New Thing', price: 5 });
    component.addProduct();

    const req = httpTesting.expectOne(API);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'New Thing', price: 5 });
    req.flush({ id: '99', name: 'New Thing', price: 5 });
    fixture.detectChanges();

    expect(rowCount()).toBe(4);
    const firstRow = fixture.nativeElement.querySelector('.product-row');
    expect(firstRow.textContent).toContain('New Thing');
    expect(component.showAddForm()).toBe(false);
  });

  it('rejects an add submission with a non-positive price', () => {
    flushInitialLoad();

    component.showAddForm.set(true);
    component.addForm.setValue({ name: 'Freebie', price: 0 });
    component.addProduct();

    // Invalid form: no POST is issued and the form stays open.
    httpTesting.expectNone(API);
    expect(component.addForm.invalid).toBe(true);
  });
});
```

---

## Rule compliance self-check

**Architecture (`architecture.md`)**
- [x] New feature lives under `features/products/`, not scattered elsewhere. Structure: `models/`, `services/` (service + state), `pages/product-list/` (container), `products.routes.ts`.
- [~] Container/presentational split: I kept a **single container component** (`ProductListComponent`) rather than extracting presentational children (a `product-row`, an `add-form`). Judgment call — see Assumptions. For a feature this small, sharing one state object, I judged a split into dumb children to be over-engineering; the rule says split "where it made sense," and here it didn't clearly. A stricter reviewer may want the list-row and/or add-form extracted. Flagging honestly rather than claiming a clean pass.
- [x] No `HttpClient` injected directly in a component — the component depends on `ProductsState`, which depends on `ProductsService`, which uses the shared `ApiService`. `HttpClient` appears nowhere in feature code.

**Angular patterns (`angular.md`)**
- [x] `@for` has `track product.id`.
- [x] No `@Input()`/`@Output()` decorators (none used — no mixing).
- [x] State updates are immutable — `_products.update((list) => [created, ...list])` and `.filter(...)`; never `.push()`/`.mutate()`.
- [x] No non-trivial method calls in template expressions — template reads signals (`products()`, `loading()`, `showAddForm()`) and form control state; `deleteProduct(product)`/`toggleAddForm()`/`addProduct()` are event handlers only. The `| currency` pipe handles price formatting.
- [x] Forms use **Reactive Forms** — confirmed by reading `angular.md` first, which explicitly states Signal Forms doesn't exist on Angular 19 (introduced v21) so Reactive Forms is the documented approach for this v19 project. Used a `FormControl` for search and a `FormGroup` for add; a pure custom `positivePrice` validator alongside `Validators.required` (per the rule's guidance to keep custom validators pure functions and prefer built-ins where they fit).
- [x] Zoneless respected — `provideExperimentalZonelessChangeDetection()` is the app's CD (not touched), and I mirrored it in every spec's TestBed (matching the pattern the generated `app.component.spec.ts` already uses).

**Accessibility (`accessibility.md`)**
- [x] No interactive `<div>`/`<span>` — the delete control and toggles are real `<button type="button">`; the search input has an `aria-label`; each delete button has an `[attr.aria-label]="'Delete ' + product.name"`; form inputs have associated `<label for>`.
- [x] No custom interactive widget built (native `confirm()` used for delete confirmation per the spec, plain inputs/buttons otherwise) → no CDK needed.

**Security (`security.md`)**
- [x] No hardcoded API URLs — `ApiService` derives the base URL from `api.config.ts`/`environment.ts`; feature code only uses the relative path `'/products'`.
- [x] No `DomSanitizer.bypassSecurityTrust*` calls.
- [x] No secrets/keys hardcoded.

**Styling (`styling` is `none`)**
- [x] No component library added — plain component-scoped SCSS only.
- [x] No hardcoded hex/rgb/hsl colors outside the central token definition. All color literals live in `:root` in `src/styles.scss`; component SCSS uses `var(--…)` exclusively.

**Testing**
- [x] Every new component/service has a co-located `.spec.ts` (service, state, component — 3 spec files).
- [x] Tests assert real behavior: initial render (3 rows), case-insensitive search filtering (typing narrows the list), delete removes an item (and cancel does not), add prepends a valid product (and a non-positive price is rejected). 16 specs total, all green.

## Hook behavior observed

No hook **blocked** any write — the code was written to satisfy the guardrails up front. PostToolUse hooks ran silently (non-blocking). The one hook that would have transiently warned is `check-missing-spec` (source file written before its spec), resolved as soon as the spec file was added.

| Hook | What triggered it | Correct block, or false positive? | Notes |
|---|---|---|---|
| `check-hardcoded-colors.sh` | Every `*.scss`/`*.html` write | Correctly did **not** block | Component SCSS uses only `var(--…)`; literals are confined to `:root` token definitions in `styles.scss`, which the hook exempts. |
| `check-for-track.sh` | `product-list.component.html` write | Correctly did **not** block | `@for` includes `track product.id`. |
| `check-interactive-div-span.sh` | `product-list.component.html` write | Correctly did **not** block | Delete/toggle are real `<button>`s; `<span>`s are non-interactive labels only. |
| `check-no-httpclient-in-component.sh` | Component `.ts` write | Correctly did **not** block | No `HttpClient` reference in the component. |
| `check-mixed-input-apis.sh` | Component `.ts` write | Correctly did **not** block | No `@Input()`/`@Output()` used. |
| `check-hardcoded-api-url.sh` | Service `.ts` write | Correctly did **not** block | Only the relative path `'/products'` is used. |
| `check-missing-spec.sh` (PostToolUse, warn-only) | Writing `products.service.ts` / `products.state.ts` / `product-list.component.ts` before their specs existed | Correct (non-blocking) warning | Transient — each spec was added immediately after; final state has full spec coverage. |
| `format-and-lint.sh`, `check-tsc.sh` (PostToolUse) | Every `.ts`/`.html`/`.scss` write | Ran non-blocking | Files came back prettier-formatted; no type errors surfaced. |
| `protect-paths.sh` | All writes | Correctly did **not** block | No writes targeted protected paths (`api.service.ts`, `environment.ts`, `.claude/**`, etc.). |

## Anything that should have been blocked, but wasn't

Nothing identified. I could not find a rule the pasted code violates that a hook missed. The one item I'm explicitly flagging for the central-brain review (not a hook gap, a judgment call): the single-container design vs. the architecture file's container/presentational preference — see the Architecture self-check note and Assumptions.

## Rule/CLAUDE.md guidance gaps

1. **The generator's own final `git commit` fails on Node < 20.19 (real, reproducible).** After a fully successful scaffold + bundle apply + `npm install`, `generate.js`'s Step 8 (`git init` + initial commit) fails because the husky `pre-commit` → `lint-staged` → `listr2` chain does `import { styleText } from 'node:util'`, an export added only in Node 20.19. On Node v20.11.1 this is a hard `SyntaxError` and the commit aborts. Impact: the generated project is complete and correct on disk, but it is left as an **uncommitted working tree** with no initial commit. This is the same `lint-staged`/`listr2` Node-engine friction testers 1 and 4 flagged as *warnings* on Node 20.19/20.20 — but below 20.19 it escalates from a cosmetic warning to a hard failure of the generator's last step. Suggestion for central-brain: either (a) run the initial commit with `--no-verify` (the pre-commit hook adds no value on the generator's own first commit), or (b) pin `lint-staged`/`listr2` to versions whose engine floor the company's supported Node baseline actually meets, or (c) document a hard Node ≥20.19 prerequisite in the skill and generator prereq check (currently the prereq check only verifies node/npm/git/jq *exist*, not their versions).

2. **New required `--e2e` axis is not reflected in the `run-feature-test` skill's assignment table.** The skill's Step 2 table (all 6 rows) omits `--e2e`, but `generate.js` now hard-requires it (added in commit e9abcaa). A tester following the table verbatim hits an immediate `Missing --e2e=<option>` error. I picked `--e2e=none` and documented it, but the skill's inlined table should be updated to include an e2e flag per row so future runs don't rely on each tester guessing.

3. **Zoneless test setup requires per-spec `provideExperimentalZonelessChangeDetection()`, and this isn't documented in `angular.md`'s Testing section.** The project is zoneless (no `zone.js`, `polyfills: []` in both build and test targets), so any `TestBed` that instantiates change detection throws `NG0908: Angular requires Zone.js` unless the spec adds `provideExperimentalZonelessChangeDetection()` to its providers. The generated `app.component.spec.ts` *does* include it (good reference), but `angular.md`'s Testing section never mentions it — I initially wrote all three specs without it and got 13/16 failures before matching the generated spec's pattern. A one-line note in `angular.md` Testing ("in this zoneless project every TestBed must include `provideExperimentalZonelessChangeDetection()` — see `app.component.spec.ts`") would have prevented the wrong first attempt. Alternatively, a shared test-setup helper that provides it centrally would remove the per-spec boilerplate entirely.

4. **Minor: `angular.md` Forms guidance for v19 is clear, but the "check angular.md rather than assuming" instruction in the skill assumes most targets are v21+ (Signal Forms).** For this run the target resolved all the way down to Angular 19, so Reactive Forms was correct. No gap in the rule file itself — flagging only that the fallback-to-v19 path (forced by the Node version here) lands on the *minority* forms approach, which is worth the central brain being aware of when reviewing.

## Final verification

| Check | Result |
|---|---|
| `ng lint` | ✅ Pass — "All files pass linting." |
| `ng build` | ✅ Pass — bundle generated; `product-list-component` and `products-routes` appear as **lazy chunks**, confirming lazy loading works. |
| `ng test` | ✅ Pass — **16/16 specs** (`TOTAL: 16 SUCCESS`) after adding the zoneless CD provider to specs. Run with `CHROME_BIN=/Applications/Google Chrome.app/... --browsers=ChromeHeadless`. |

## Assumptions made

1. **`--e2e=none`.** The skill's assignment table (Step 2) predates the now-required `--e2e` axis and doesn't specify a value for tester 6. Chose `none` as the conservative option — it matches this bundle's minimal/standard character, and avoids the Playwright installer entirely (which prior sessions flagged as a hang risk). Documented rather than asked, per the zero-questions rule.
2. **Angular version fallback → 19.** Assignment says "latest" (no flag). This machine's Node is v20.11.1, below the floor of *every* current Angular CLI (v22 needs ≥22.22.3; v21/v20/v19 CLIs all report needing ≥20.19). Per the skill's fallback rule I tried 22 → 21 → 20 → 19 in order; only 19's `ng new` completed. Note this is one step further down than testers 1 and 4 (who were on Node 20.19/20.20 and landed on Angular 21) — purely because this machine's Node is older. Angular 19 → Reactive Forms (confirmed via `angular.md`).
3. **Proceeded despite the generator's failed initial `git commit`.** Treated it as a non-fatal, post-scaffold bootstrap failure (all files present, deps installed, everything builds/tests) rather than a hard generator refusal, and continued with the feature build. Documented the failure fully in "Rule/CLAUDE.md guidance gaps #1". Rationale: the feature test only needs a working project tree, not the generator's own initial commit; stopping here would have wasted the run over a cosmetic Node-version bootstrap issue.
4. **Single container component, no presentational-child split.** The architecture rule says split container/presentational "where it made sense." For a small single-state feature I judged extracting dumb children (row, add-form) to be over-engineering and kept one container. Documented as a reviewable judgment call rather than silently claiming a clean split.
5. **Server-confirmed (non-optimistic) list updates.** `addProduct`/`removeProduct` update the local signal only in the observable's `next` callback (i.e. after the REST call succeeds), not optimistically. This matches conventional REST semantics and keeps client state consistent with the server. Consequence: against a non-existent backend (as in this test), the running app's add/delete won't visibly mutate the list — expected per the spec's "a backend doesn't need to actually exist." An optimistic-update variant would be the alternative if instant UI feedback without a backend were desired.
6. **Custom `positivePrice` validator for ">0".** The spec requires price "greater than 0". Angular's built-in `Validators.min` is *inclusive* (`min(0)` allows 0), so I wrote a small pure custom validator returning `{ positivePrice: true }` for non-positive values, composed with `Validators.required`. This follows `angular.md`'s guidance (prefer built-ins, but a pure custom function is fine for a genuinely app-specific rule).
7. **`ChromeHeadless` with an explicit `CHROME_BIN`.** The homebrew `chromium` symlink on this machine is broken (points to a non-existent `/Applications/Chromium.app`). Used the system Google Chrome at `/Applications/Google Chrome.app/...` as `CHROME_BIN` to run Karma headless. Environment-specific, not a project concern.

## Anything else worth flagging

- **Lazy-loading verified two ways:** the build output emits `product-list-component` and `products-routes` as separate lazy chunks, and `app.routes.ts` uses `loadChildren` → `products.routes.ts` uses `loadComponent`. `ProductsState` is provided at the feature route level (not `providedIn: 'root'`), so its lifetime is scoped to the feature per `state.md`.
- **`ProductsService` is `providedIn: 'root'` while `ProductsState` is feature-scoped.** Deliberate: the stateless REST wrapper is a fine app-wide singleton; the stateful store is scoped to the feature route so it resets between visits. Both are consistent with `state.md`/`data-layer.md`, but calling it out since the split might look inconsistent at a glance.
- **28 npm vulnerabilities** were reported by `npm install` (2 low, 10 moderate, 16 high) — this is the standard `ng new` dependency tree on this Angular/Node combo, not introduced by the feature. Not investigated further as it's out of scope for a feature test, but noting the count.
- Feature was **not** run in a live browser (`ng serve`) — verification was via lint/build/test per the skill's Step 5. The build succeeding + 16 passing specs (which exercise render, search, delete, add through the real service/HTTP chain) is the behavioral evidence.
