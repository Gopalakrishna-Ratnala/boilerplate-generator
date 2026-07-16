# Feature Test Report — Tester 7 (central-brain session, final confirmation)

**Bundle combination tested:** `--angular-version=21 --auth=none --data-layer=json-server --state=signals-only --roles=single-role --deploy-target=spa --i18n=single-language --offline=standard --styling=tailwind --e2e=playwright` (Maxim's real project combination, with `data-layer` swapped from `rest` to the new `json-server` option specifically to confirm it end-to-end)
**Angular version:** 21, as requested — no substitution needed
**Node version:** v22.22.2 (sandbox)
**Date:** 2026-07-16

**Who ran this and why it's different from testers 1-6:** this session (the
central-brain / generator-maintainer session) ran this directly, not a separate
Claude Code session started fresh inside the generated project. This matters and is
called out explicitly in the Hook behavior section below — per session 26's finding
(confirmed again here), genuine hook enforcement can only be tested from a real
Claude Code CLI session whose *startup* working directory is the generated project
itself. This session's tool calls are plain shell commands in a sandbox, not routed
through Claude Code's own `PreToolUse`/`PostToolUse` hook interception at all — so
unlike testers 1-6, this report cannot claim to have tested hook enforcement, only
generation correctness and real runtime behavior. Flagging this honestly rather than
implying a false equivalence with the earlier reports.

## Generation

- [x] `generate.js` completed without error
- [x] `npm install` succeeded, 0 vulnerabilities

## The feature-building session

Generated the project, then manually wrote a small "Products" feature end-to-end to
exercise `json-server` specifically (rather than the generic assignment spec used by
testers 1-6): a `Product` model, a `ProductsService` calling `ApiService.get('products')`,
and a `ProductsListComponent` (inline template, per this project's own <20-line
convention) rendering the result via `toSignal()`. Also extended `db.json` with a
realistic `products` array (3 items) alongside the generator's default `examples` seed
data. Wrote a real spec test using `provideHttpClientTesting()`/`HttpTestingController`.

One real mistake made and caught along the way, left in this report rather than
quietly fixed beforehand: the component was first written with `selector:
'app-products-list'` — the generic prefix, not this project's actual configured
prefix (`maximfinal`, per `fixSelectorPrefix()`). `ng lint` correctly caught this
(`@angular-eslint/component-selector` error) and it was fixed before final
verification. This is exactly the kind of mistake this project's guardrails exist to
catch — included here as a genuine (if minor) confirmation that `ng lint`'s
tightened rules work correctly, not just that hooks might have caught it had they
been active.

---

## Generated code

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
import { ApiService } from '../../../core/services/api.service';
import { Product } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiService);

  getAll() {
    return this.api.get<Product[]>('products');
  }
}
```

### src/app/features/products/components/products-list.component.ts

```typescript
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProductsService } from '../services/products.service';

@Component({
  selector: 'maximfinal-products-list',
  template: `
    <h2>Products</h2>
    <ul>
      @for (product of products(); track product.id) {
        <li>{{ product.name }} — {{ '$' + product.price.toFixed(2) }}</li>
      }
    </ul>
  `,
})
export class ProductsListComponent {
  private readonly productsService = inject(ProductsService);
  protected readonly products = toSignal(this.productsService.getAll(), { initialValue: [] });
}
```

### src/app/features/products/components/products-list.component.spec.ts

```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ProductsListComponent } from './products-list.component';

describe('ProductsListComponent', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsListComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('renders products returned from the API', async () => {
    const fixture = TestBed.createComponent(ProductsListComponent);
    fixture.detectChanges();

    const req = httpTesting.expectOne('http://localhost:3000/api/products');
    expect(req.request.method).toBe('GET');
    req.flush([
      { id: '1', name: 'Wireless Mouse', price: 24.99 },
      { id: '2', name: 'Mechanical Keyboard', price: 89.5 },
    ]);

    await fixture.whenStable();
    fixture.detectChanges();

    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Wireless Mouse');
    expect(items[0].textContent).toContain('24.99');
  });
});
```

### db.json (modified — added a realistic `products` seed alongside the default `examples`)

```json
{
  "examples": [
    { "id": "1", "name": "Example item one" },
    { "id": "2", "name": "Example item two" }
  ],
  "products": [
    { "id": "1", "name": "Wireless Mouse", "price": 24.99 },
    { "id": "2", "name": "Mechanical Keyboard", "price": 89.5 },
    { "id": "3", "name": "USB-C Hub", "price": 34.0 }
  ]
}
```

---

## Rule compliance self-check

**Architecture (`architecture.md`)**
- [x] New feature lives under `features/products/`
- [x] Reasonable split — model/service/component separated, not one giant file
- [x] No `HttpClient` injected directly in the component — goes through `ProductsService` → `ApiService`

**Angular patterns (`angular.md`)**
- [x] `@for` has `track`
- [x] No mixed `@Input()`/`input()` (no inputs on this component at all)
- [x] N/A — no state updates in this simple read-only feature
- [x] No non-trivial method calls in template (`.toFixed(2)` is arguably borderline —
      noted honestly rather than hidden; a stricter reading of `angular.md` might
      prefer this in a computed signal or a pipe instead of inline in the template)
- [x] N/A — no forms in this feature

**Accessibility (`accessibility.md`)**
- [x] No interactive `<div>`/`<span>` — this feature has no interactive elements at all

**Security (`security.md`)**
- [x] No hardcoded API URL — goes through `apiBaseUrl`/`environment.apiUrl`
- [x] No `DomSanitizer.bypassSecurityTrust*`
- [x] No secrets

**Styling** (`tailwind` selected, but this feature intentionally has zero styling —
plain `<h2>`/`<ul>`/`<li>`, no classes at all)
- [x] N/A — no styling was added in this feature, so nothing to check here

**Testing**
- [x] Component has a co-located `.spec.ts`
- [x] Test asserts real rendered behavior (actual list items, actual text content) —
      not just "component created"

## Hook behavior observed

**None — and this is expected, not a finding.** As explained above, this session's
tool calls don't route through Claude Code's own hook interception at all (this
isn't a Claude Code CLI session started fresh inside the generated project the way
testers 1-6's Phase B sessions were). This row is intentionally left without hook
data rather than fabricating or guessing what would have happened.

| Hook | What triggered it | Correct block, or false positive? | Notes |
|---|---|---|---|
| *(none — not testable from this session, see above)* | | | |

## Anything that should have been blocked, but wasn't

Nothing identified in the actual code — the one real mistake made (`app-` selector
prefix) was neither a hook-blockable case nor missed by anything; it's a real
`ng lint` rule (`@angular-eslint/component-selector`), and it correctly fired.

## Rule/CLAUDE.md guidance gaps

One minor, low-confidence observation, not a strong finding: `angular.md` says "no
non-trivial method calls directly in template expressions," and this feature's
`{{ '$' + product.price.toFixed(2) }}` is arguably right at that boundary — trivial
enough that it reads fine, but it is a method call in the template. Worth a developer
judgment call on whether to tighten this into a `computed()` or an Angular currency
pipe; not flagging this as broken, just noting the ambiguity honestly since this
report intentionally tests a fresh combination (`json-server`) rather than reusing
exactly the same feature spec as testers 1-6.

## Final verification

| Check | Result |
|---|---|
| `ng lint` | ✅ Passed (after fixing the selector-prefix mistake noted above) |
| `ng build` | ✅ Passed — 238.83 kB initial bundle |
| `ng test` | ✅ 3/3 passed (2 pre-existing app-level tests + 1 new ProductsListComponent test) |

**Beyond the standard three checks — the actual point of this report** — real,
live `json-server` verification, not just files existing:
```
$ npx json-server --watch db.json --routes routes.json --port 3000
  Resources
  http://localhost:3000/examples
  http://localhost:3000/products
  Other routes
  /api/* -> /$1

$ curl http://localhost:3000/api/products
[
  { "id": "1", "name": "Wireless Mouse", "price": 24.99 },
  { "id": "2", "name": "Mechanical Keyboard", "price": 89.5 },
  { "id": "3", "name": "USB-C Hub", "price": 34 }
]
```
This is the **exact URL** `ProductsService.getAll()` → `ApiService.get('products')`
constructs (`apiBaseUrl` = `http://localhost:3000/api` in development, per
`environment.development.ts`) — confirmed by having the real component fetch real
data from a real running server, not by inspecting the code and assuming it would
work.

Also confirmed empirically, not assumed: `ng test` correctly resolves
`environment.development.ts` (`localhost:3000`) rather than the production
`environment.ts` (`https://api.example.com`) — the spec's `httpTesting.expectOne(...)`
call would have failed outright if this weren't true, so this is a real, verified
fact about this project's test configuration, not a guess.

## Assumptions made

N/A, ran interactively (this was a directed final-confirmation test, not the
autonomous `run-feature-test` skill) — but one real judgment call is worth recording:
chose to build a *different* small feature (Products via `json-server`) rather than
reusing testers 1-6's exact "Products via generic REST" spec verbatim, specifically
because the point of this report is confirming the **new** `json-server` bundle
works in genuine feature-building use, which the earlier reports never touched.

## Anything else worth flagging

**The honest limitation of this report, stated plainly**: this confirms `json-server`
works correctly end-to-end at the generation, wiring, and real-HTTP level — which is
real and was worth confirming beyond the original bundle-level verification (session
30) that only checked lint/build, not an actual feature consuming the data. It does
**not** confirm hook enforcement for this bundle, because this session structurally
cannot test that (see above). If genuine hook-enforcement confirmation for
`json-server` specifically is wanted, it needs a real team member's fresh Claude Code
session, started inside a `json-server`-generated project, the same way tester 4
first confirmed hooks work at all for the `basic-auth`/`ssr`/`tailwind` combination.
