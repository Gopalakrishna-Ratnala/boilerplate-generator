# Data Layer: json-server (local fake REST API)

## What pattern is used

This project uses [json-server](https://github.com/typicode/json-server) (pinned to
the stable `0.17.x` line — **not** its `latest` npm tag, which is currently an
unstable v1 beta that doesn't support the `--routes` flag this project relies on) to
serve a **real, local REST API** from `db.json` at the project root. This is
different from the `mock` data-layer option: `mock` returns static in-memory data
with no real HTTP call at all, while this option makes genuine `HttpClient` requests
against a genuine (if fake) HTTP server — the full request/response cycle, real
network errors, real status codes.

- `db.json` (project root) is the actual data. Each top-level array key becomes a
  full REST resource automatically: adding `"products": [...]` gives you
  `GET/POST/PUT/PATCH/DELETE /products` for free, no code to write for that part.
- `routes.json` (project root) rewrites `/api/*` to the real resource path, so the
  app's `apiBaseUrl` (`http://localhost:3000/api` in development, see
  `environment.ts`) matches the same URL shape a real backend would use.
- Start it with `npm run mock-api` (runs alongside `ng serve`, in a separate
  terminal — this doesn't start automatically with the dev server).
- The same `ApiService`/`errorInterceptor` pattern as the `rest` data-layer option is
  used here, since json-server responds like a real REST backend — see
  `core/services/api.service.ts`.

## What the AI agent may do

- Add a new top-level array key to `db.json` when a feature needs a new resource
  collection (e.g. add `"products": [...]` with a few realistic seed records) — this
  is the correct way to add mock data for a new feature, not a separate in-memory
  fixture file.
- Use `ApiService` (inject it, don't inject `HttpClient` directly) exactly the same
  way as the `rest` data-layer option's rules describe.
- Add realistic example records to a resource array — 3-5 records with varied,
  plausible values is more useful for building/testing a feature than 1 minimal one.

## What the AI agent must NOT do

- Do not hardcode a separate in-memory fixture array in a service when `db.json`
  already exists — `db.json` is the single source of mock data for this project. Two
  competing sources of "fake data" is confusing and defeats the point of using a real
  local server.
- Do not treat this as production-ready — json-server has no authentication, no real
  validation, and is explicitly a local development tool. If this project's auth
  bundle isn't `none`, the interceptor chain still runs correctly against
  json-server, but don't assume json-server itself is enforcing anything about who
  can call it.
- Do not edit `routes.json`'s rewrite rule without a real reason — it exists so this
  project's URL shape matches what a real backend would look like later; removing it
  would make `apiBaseUrl`'s `/api` prefix stop resolving to anything.
- Do not assume numeric-only IDs — json-server (this pinned version) accepts either
  string or numeric IDs; keep whichever convention `db.json`'s existing records use
  for a given resource, don't mix both within one resource array.

## Where the code lives

- `db.json` — the actual mock data (project root, edit this directly).
- `routes.json` — the `/api` prefix rewrite (project root, don't remove).
- `src/app/core/config/api.config.ts` — where `apiBaseUrl` comes from.
- `src/app/core/services/api.service.ts` — shared `HttpClient` wrapper, use this
  instead of injecting `HttpClient` directly in a feature service.
- `src/app/core/interceptors/error.interceptor.ts` — centralized HTTP error handling.
