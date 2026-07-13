# Data Layer: Static / Mock

## What pattern is used

There is no real backend yet. Every feature's "API" is a service that returns static,
in-memory fixture data shaped like the eventual real response — wrapped with
`mockResponse()` so it behaves like an async call (loading states, `async` pipe usage
work the same way they will once a real API exists).

## What the AI agent may do

- Create a fixture constant (e.g. `MOCK_USERS`) inside a feature's `services/` folder,
  shaped like what the real API response is expected to look like.
- Create a feature service method that returns `mockResponse(MOCK_USERS)` from
  `shared/services/mock-response.ts`.
- Simulate simple filtering/pagination/search *client-side* against the fixture data if
  a feature needs it to feel realistic (e.g. `.filter()` on the mock array before
  wrapping in `mockResponse()`).

## What the AI agent must NOT do

- Do not add `HttpClient` calls to a real endpoint — there is no backend yet. If a task
  seems to need a real API call, that's a sign this project's data-layer bundle
  selection needs revisiting by a developer, not something to work around with a guess
  at an endpoint URL.
- Do not add a mock backend server (json-server, MSW, etc.) as a dependency — the
  pattern here is in-memory fixtures in the Angular code itself, not a separate mock
  server process.

## Where the code lives

- `src/app/shared/services/mock-response.ts` — the `mockResponse()` helper (shared,
  don't duplicate this per feature).
- `src/app/features/<feature>/services/` — each feature's own fixture data + service
  method using `mockResponse()`.
