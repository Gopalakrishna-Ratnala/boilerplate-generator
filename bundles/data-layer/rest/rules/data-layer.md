# Data Layer: REST API

## What pattern is used

This project talks to a REST backend. A shared `ApiService` wraps `HttpClient` with the
base URL and a consistent `get/post/put/patch/delete` surface. A shared
`errorInterceptor` normalizes HTTP errors in one place.

**`provideHttpClient(withInterceptors([..., errorInterceptor]))` is already wired in
`app.config.ts`** by the generator itself — this is a real, working setup, not
something to add yourself. Don't add a second `provideHttpClient(...)` call.

## What the AI agent may do

- Inject `ApiService` in a feature service and call `apiService.get<User[]>('/users')`,
  etc. — paths are relative, the base URL is handled automatically.
- Create new feature-specific services that use `ApiService` internally.
- Handle feature-specific error cases (e.g. "show a specific message on a 404 for this
  resource") in the feature service/component, on top of what the interceptor already
  normalizes.

## What the AI agent must NOT do

- **Do not inject `HttpClient` directly in a feature service.** Always go through
  `ApiService` so the base URL and request shape stay consistent app-wide. Two
  different HTTP-calling patterns in the same app is exactly the "inconsistent
  architecture" risk this guardrail exists to prevent.
- **Do not edit** `api.service.ts`, `error.interceptor.ts`, or `api.config.ts` —
  protected by `.claude/settings.json`. Changing the shared mechanism affects every
  feature that depends on it.
- Do not hardcode the API base URL anywhere — it comes from `api.config.ts` /
  `environment.ts`, never a literal string in a feature file.
- Do not add a second global error-handling mechanism (e.g. a second interceptor doing
  similar work, or wrapping every call in its own try/catch for generic network errors)
  — the existing interceptor already does this.

## Where the code lives

- `src/app/core/config/api.config.ts` — reads the base URL from `environment.ts`
  (protected).
- `src/app/core/services/api.service.ts` — shared REST wrapper (protected).
- `src/app/core/interceptors/error.interceptor.ts` — shared error normalization
  (protected).
- `src/app/features/<feature>/services/` — feature-specific services built on top of
  `ApiService`.
