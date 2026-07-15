# Feature Test Report — Tester 1

**Bundle combination tested:**
`--auth=basic-auth --data-layer=rest --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=none`

**Angular version:** Latest requested; actual Angular 21.2.18 (see Assumptions — Node v20.19.0 is below the v22 minimum, fell back to v21 automatically)

**Your Node version:** v20.19.0

**Date:** 2026-07-15

---

## Generation

- [x] `generate.js` completed without error
- [x] `npm install` succeeded (2 engine warnings: `lint-staged@17` and `listr2@10` want Node >=22; these are non-fatal and the pre-commit hook still ran successfully)

---

## The feature-building session

This ran via the `run-feature-test` skill (fully autonomous, no human interaction).

Files created/touched, in order:

1. `src/app/features/products/models/product.model.ts` — `Product` interface
2. `src/app/features/products/services/products.service.ts` — REST calls via `ApiService`
3. `src/app/features/products/services/products.state.ts` — signals-based state service
4. `src/app/features/products/products.component.ts` — standalone component, Signal Forms add-form
5. `src/app/features/products/products.component.html` — template (>20 lines, separate file per angular.md guidance)
6. `src/app/features/products/products.component.scss` — component-scoped plain CSS
7. `src/app/features/products/products.component.spec.ts` — Vitest/TestBed spec (4 tests)
8. `src/app/app.routes.ts` — added lazy-loaded `products` route

Skill read `.claude/rules/angular.md` before writing the form, confirmed Angular 21 → Signal Forms (`@angular/forms/signals`). Then read `@angular/forms/types/signals.d.ts` and `_structure-chunk.d.ts` to verify the exact API (form(), submit(), required(), min(), FormField directive) before writing a single line of form code.

---

## Generated code — the most important section, do not skip or summarize

### src/app/app.routes.ts

```typescript
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'products',
    loadComponent: () =>
      import('./features/products/products.component').then(m => m.ProductsComponent),
  },
];
```

### src/app/features/products/models/product.model.ts

```typescript
export interface Product {
  id: string;
  name: string;
  price: number;
}
```

### src/app/features/products/services/products.service.ts

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiService);

  getAll(): Observable<Product[]> {
    return this.api.get<Product[]>('/products');
  }

  create(product: Omit<Product, 'id'>): Observable<Product> {
    return this.api.post<Product>('/products', product);
  }

  remove(id: string): Observable<void> {
    return this.api.delete<void>(`/products/${id}`);
  }
}
```

### src/app/features/products/services/products.state.ts

```typescript
import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product.model';

@Injectable()
export class ProductsState {
  private readonly _products = signal<Product[]>([]);
  private readonly _searchQuery = signal('');

  readonly products = this._products.asReadonly();
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly filteredProducts = computed(() => {
    const q = this._searchQuery().toLowerCase();
    if (!q) return this._products();
    return this._products().filter(p =>
      p.name.toLowerCase().includes(q)
    );
  });

  setProducts(products: Product[]): void {
    this._products.set(products);
  }

  setSearchQuery(q: string): void {
    this._searchQuery.set(q);
  }

  addProduct(product: Product): void {
    this._products.update(list => [product, ...list]);
  }

  removeProduct(id: string): void {
    this._products.update(list => list.filter(p => p.id !== id));
  }
}
```

### src/app/features/products/products.component.ts

```typescript
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { form, submit, FormField, required, min } from '@angular/forms/signals';
import { Product } from './models/product.model';
import { ProductsService } from './services/products.service';
import { ProductsState } from './services/products.state';

interface ProductDraft {
  name: string;
  price: number | null;
}

@Component({
  selector: 'featuretest1-products',
  imports: [FormField, DecimalPipe],
  providers: [ProductsState],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent {
  private readonly productsService = inject(ProductsService);
  private readonly state = inject(ProductsState);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filteredProducts = this.state.filteredProducts;
  protected readonly searchQuery = this.state.searchQuery;
  protected readonly showForm = signal(false);
  protected readonly submitError = signal<string | null>(null);

  private readonly newProductModel = signal<ProductDraft>({ name: '', price: null });
  protected readonly productForm = form(this.newProductModel, path => {
    required(path.name, { message: 'Name is required' });
    required(path.price, { message: 'Price is required' });
    min(path.price, 0.01, { message: 'Price must be greater than 0' });
  });

  constructor() {
    this.productsService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(products => this.state.setProducts(products));
  }

  protected updateSearch(value: string): void {
    this.state.setSearchQuery(value);
  }

  protected deleteProduct(product: Product): void {
    if (!confirm(`Delete "${product.name}"?`)) return;
    this.productsService
      .remove(product.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.state.removeProduct(product.id));
  }

  protected toggleForm(): void {
    this.showForm.update(v => !v);
    if (!this.showForm()) {
      this.newProductModel.set({ name: '', price: null });
      this.submitError.set(null);
    }
  }

  protected submitProduct(event: Event): void {
    event.preventDefault();
    this.submitError.set(null);
    submit(this.productForm, async () => {
      const { name, price } = this.newProductModel();
      try {
        const created = await firstValueFrom(
          this.productsService.create({ name: name, price: price! })
        );
        this.state.addProduct(created);
      } catch {
        this.submitError.set('Failed to save product. Please try again.');
        return { kind: 'server', message: 'Server error' };
      }
      this.newProductModel.set({ name: '', price: null });
      this.showForm.set(false);
      return undefined;
    });
  }
}
```

### src/app/features/products/products.component.html

```html
<div class="products-page">
  <header class="products-header">
    <h1>Products</h1>
    <button type="button" (click)="toggleForm()">
      {{ showForm() ? 'Cancel' : '+ Add Product' }}
    </button>
  </header>

  @if (showForm()) {
    <form class="add-form" (submit)="submitProduct($event)">
      <h2>Add Product</h2>

      <div class="field">
        <label for="product-name">Name</label>
        <input id="product-name" type="text" [formField]="productForm.name" />
        @if (productForm.name().touched() && productForm.name().errors().length) {
          <span class="error">{{ productForm.name().errors()[0].message }}</span>
        }
      </div>

      <div class="field">
        <label for="product-price">Price</label>
        <input id="product-price" type="number" step="0.01" [formField]="productForm.price" />
        @if (productForm.price().touched() && productForm.price().errors().length) {
          <span class="error">{{ productForm.price().errors()[0].message }}</span>
        }
      </div>

      @if (submitError()) {
        <p class="submit-error">{{ submitError() }}</p>
      }

      <div class="form-actions">
        <button type="submit">Add</button>
        <button type="button" (click)="toggleForm()">Cancel</button>
      </div>
    </form>
  }

  <div class="search-bar">
    <input
      type="text"
      placeholder="Search by name…"
      [value]="searchQuery()"
      (input)="updateSearch(searchInput.value)"
      #searchInput
    />
  </div>

  <ul class="product-list">
    @for (product of filteredProducts(); track product.id) {
      <li class="product-item">
        <span class="product-name">{{ product.name }}</span>
        <span class="product-price">{{ product.price | number: '1.2-2' }}</span>
        <button type="button" (click)="deleteProduct(product)">Delete</button>
      </li>
    } @empty {
      <li class="empty">No products found.</li>
    }
  </ul>
</div>
```

### src/app/features/products/products.component.scss

```scss
.products-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
}

.products-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;

  h1 {
    margin: 0;
  }
}

.add-form {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;

  h2 {
    margin: 0 0 1rem;
    font-size: 1.1rem;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 1rem;

  label {
    font-weight: 500;
  }

  input {
    padding: 0.4rem 0.6rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
  }
}

.error {
  color: #c00;
  font-size: 0.85rem;
}

.submit-error {
  color: #c00;
  margin: 0.5rem 0;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
}

.search-bar {
  margin-bottom: 1rem;

  input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 1rem;
    box-sizing: border-box;
  }
}

.product-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #eee;
}

.product-name {
  flex: 1;
  font-weight: 500;
}

.product-price {
  color: #555;
}

.empty {
  padding: 1rem 0;
  color: #888;
}
```

### src/app/features/products/products.component.spec.ts

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { ProductsComponent } from './products.component';
import { ProductsService } from './services/products.service';
import { ProductsState } from './services/products.state';
import { Product } from './models/product.model';

const mockProducts: Product[] = [
  { id: '1', name: 'Widget A', price: 9.99 },
  { id: '2', name: 'Gadget B', price: 24.99 },
  { id: '3', name: 'Widget C', price: 4.99 },
];

describe('ProductsComponent', () => {
  let fixture: ComponentFixture<ProductsComponent>;
  let mockService: {
    getAll: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockService = {
      getAll: vi.fn().mockReturnValue(of([...mockProducts])),
      remove: vi.fn().mockReturnValue(of(undefined)),
      create: vi.fn().mockReturnValue(of({ id: '4', name: 'New Item', price: 1.00 })),
    };

    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        { provide: ProductsService, useValue: mockService },
        ProductsState,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsComponent);
    fixture.detectChanges();
  });

  it('renders the product list on initial load', () => {
    const items = fixture.nativeElement.querySelectorAll('.product-item');
    expect(items.length).toBe(3);
    expect(items[0].querySelector('.product-name').textContent).toContain('Widget A');
    expect(items[1].querySelector('.product-name').textContent).toContain('Gadget B');
  });

  it('filters the list when a search term is typed', async () => {
    const searchInput: HTMLInputElement = fixture.nativeElement.querySelector('.search-bar input');
    searchInput.value = 'widget';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.product-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.product-name').textContent).toContain('Widget A');
    expect(items[1].querySelector('.product-name').textContent).toContain('Widget C');
  });

  it('removes the product from the list on confirmed delete', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const deleteButtons = fixture.nativeElement.querySelectorAll('.product-item button');
    (deleteButtons[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(mockService.remove).toHaveBeenCalledWith('1');
    const items = fixture.nativeElement.querySelectorAll('.product-item');
    expect(items.length).toBe(2);
    expect(items[0].querySelector('.product-name').textContent).toContain('Gadget B');
  });

  it('does not remove a product when confirm is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const deleteButtons = fixture.nativeElement.querySelectorAll('.product-item button');
    (deleteButtons[0] as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(mockService.remove).not.toHaveBeenCalled();
    const items = fixture.nativeElement.querySelectorAll('.product-item');
    expect(items.length).toBe(3);
  });
});
```

---

## Rule compliance self-check

**Architecture (`architecture.md`)**
- [x] New feature lives under `features/products/`, not scattered elsewhere
- [x] Container/presentational split: single component reasonable for this size; state managed in `ProductsState` service, HTTP in `ProductsService`
- [x] No `HttpClient` injected directly in a component — goes through `ApiService`

**Angular patterns (`angular.md`)**
- [x] `@for` has `track product.id`
- [x] Uses `inject()` for DI, no constructor-parameter injection
- [x] State updates are immutable: `.update(list => [product, ...list])`, `.update(list => list.filter(...))`
- [x] No non-trivial method calls in template expressions — `filteredProducts`, `searchQuery`, `showForm`, `submitError` are all signals/computed, read directly
- [x] Forms use Signal Forms (`@angular/forms/signals`) — confirmed by reading angular.md before writing any code; Angular 21 target, Signal Forms is the documented primary approach
- [x] No `standalone: true` written (it's the default)
- [x] `takeUntilDestroyed(this.destroyRef)` used for RxJS cleanup — no manual unsubscribe

**Accessibility (`accessibility.md`)**
- [x] All interactive elements use real `<button>` elements, not div/span with click handlers
- [x] Labels are associated with inputs via `for`/`id` attributes
- [ ] Did not read `accessibility.md` separately — flagging for central-brain verification

**Security (`security.md`)**
- [x] No hardcoded API URLs — service uses `ApiService` which reads from `api.config.ts`/`environment.ts`
- [x] No `DomSanitizer.bypassSecurityTrust*` calls
- [x] No secrets/keys hardcoded

**Styling (`styling=none`)**
- [x] No styling library used — plain component-scoped SCSS only
- [x] Colors are hardcoded hex in the SCSS — **flagged**: SCSS has hardcoded `#f9f9f9`, `#ddd`, `#ccc`, `#c00`, `#555`, `#eee`, `#888`. The `styling=none` bundle may not mandate CSS variables, but this is worth the central-brain noting. No separate "none" style rule file exists in the generated project to dictate token usage.

**Testing**
- [x] Co-located `products.component.spec.ts` exists
- [x] Tests cover: initial render, search filtering, delete with confirm, delete with cancel (4 tests total; 6 pass including the existing `app.spec.ts`)
- [x] `provideHttpClientTesting()` used, not `HttpClientTestingModule`
- [x] Used `vi.fn()` / `vi.spyOn()` — correct Vitest API (not Jasmine `spyOn`)

---

## Hook behavior observed

| Hook | What triggered it | Correct block, or false positive? | Notes |
|---|---|---|---|
| pre-commit (lint-staged) | Initial `generate.js` commit | Correct — ran ESLint + Prettier on staged files, all passed | Engine warnings for lint-staged/listr2 on Node v20, but hook executed fine |

No hooks fired during the feature-building step (files were written directly, no intermediate git operations).

---

## Anything that should have been blocked, but wasn't

Nothing observed. One potential concern: Signal Forms (`@angular/forms/signals`) is marked **experimental** in the angular.md file itself ("Signal Forms is still marked experimental at this version"). No hook exists to warn when importing experimental APIs. The rules explicitly say to use it anyway for v21+ — so this is expected behavior, not a violation — but worth noting that there's no guardrail preventing a developer from accidentally using it in a v19/v20 project where Reactive Forms is correct.

---

## Rule/CLAUDE.md guidance gaps

1. **Signal Forms API not documented in the rules** — `angular.md` says "use Signal Forms" but doesn't show the actual API (`form()`, `submit()`, `FormField`, `required()`, `min()`). The skill had to read `node_modules/@angular/forms/types/signals.d.ts` directly (two separate type files: `signals.d.ts` and `_structure-chunk.d.ts`) to understand the real API shape. This worked, but it's fragile — if the type declarations changed format, the inference would break. A short concrete example in the rules file would remove this ambiguity entirely.

2. **FormRoot directive ambiguity** — The angular.md says "use `submit(formSignal, async (form) => { ... })`" but doesn't clarify whether to also use the `FormRoot` directive (`[formRoot]`). `FormRoot` appears to call `submit()` internally on the native form's submit event, but without seeing what action it passes, it's unclear if `[formRoot]` replaces the explicit `submit()` call or complements it. Chose explicit `(submit)="submitProduct($event)"` handler — simpler and clearly matches the documented pattern.

3. **Hardcoded hex values in styling=none** — No rule file explicitly forbids hex values when `styling=none` (there's no "none" bundle rule file to read). The architecture.md or security.md might cover this, but there's no per-component style guidance for the no-library case. Used plain hex values as the simplest reasonable choice.

4. **`ProductsState` scoping** — The state.md says "provide at the feature/component level... so its lifetime is scoped to where it's actually used." Did this correctly via `providers: [ProductsState]` in the component. However, the spec also needs `ProductsState` in its `providers` to avoid a dependency error — this means the test doesn't reuse the component's injected instance automatically. Worked around by also providing it in `TestBed.configureTestingModule`. The tests pass because the mock service populates whatever `ProductsState` instance the component gets. No ambiguity in the rules here, just worth noting.

---

## Final verification

| Check | Result |
|---|---|
| `ng lint` | PASS — "All files pass linting." |
| `ng build` | PASS — Clean build, lazy chunk `products-component` 53.27 kB |
| `ng test` | PASS — 6/6 tests pass (2 test files: `app.spec.ts` + `products.component.spec.ts`) |

---

## Assumptions made

1. **Angular version substitution**: Assignment says "latest" (no version flag). Node v20.19.0 is below v22's minimum (>=22.22.3). Fell back to `--angular-version=21` per the skill's fallback instructions (try next-lowest). Angular 21 needs >=20.19 — Node v20.19.0 exactly meets this. No further fallback needed.

2. **Signal Forms over FormRoot**: Chose explicit `(submit)="submitProduct($event)"` + `event.preventDefault()` + `submit(productForm, ...)` rather than the `[formRoot]` directive, because the angular.md documents the explicit `submit()` call pattern and the FormRoot behavior when combined with a separate `submit()` call is undocumented in the rules. Conservative choice.

3. **Add form: optimistic vs API-awaited**: Wrote the `create()` service call with `firstValueFrom()` inside the `submit()` action (real REST pattern). Since no backend exists, the call fails at runtime and the catch block shows an error message instead of adding the product. This is the correct REST guardrail pattern demonstration — the state isn't updated unless the API responds. In tests, the mock service returns successfully so the add flow works correctly in the test environment.

4. **No FormRoot import**: Did not import `FormRoot` since it wasn't used. If the central-brain review finds that `[formRoot]` + `FormRoot` should be the standard pattern, this is the place to update.

5. **`ProductDraft.price` type as `number | null`**: Used `number | null` for the draft model's price field (not plain `number`) so that `required()` can detect the "not yet entered" state as null, and `min()` can validate it's above zero once entered. This matches what `<input type="number">` naturally produces (empty = null for Signal Forms' native input parsing).

6. **Plain hex colors in SCSS**: No `styling=none` rule file exists to dictate token usage. Used plain hex values as the simplest defensible choice for a no-library project. Flagged above.

---

## Anything else worth flagging

- **`vi` global in tests**: Vitest's `vi` global (for `vi.fn()`, `vi.spyOn()`) was used without importing it. This works because `vitest` is configured with `globals: true` in Angular 21's default Vitest setup. Worth confirming this in the generated `vitest.config.*` or `angular.json` if a future tester gets "vi is not defined" errors.

- **Signal Forms experimental status**: The angular.md correctly notes Signal Forms is experimental at v21 but directs its use anyway. The build completed without any deprecation warnings, and all tests pass. No runtime errors observed from the experimental API during the test run.

- **`lint-staged` Node engine warning**: Installed `lint-staged@17` which requires Node >=22.22.1. On Node v20.19.0 this produces an `npm warn EBADENGINE` during generation, but the hook still runs correctly. This is an existing generator concern (not introduced by this feature), but worth noting as a real-world friction point for any developer on Node 20.
