# Auth: Auth0

## What pattern is used

This project uses Auth0 via the official `@auth0/auth0-angular` SDK. The SDK's own
config is isolated in `core/config/auth0.config.ts` (protected). Feature code goes
through this project's own `AuthService` wrapper (`core/services/auth.service.ts`) —
not `@auth0/auth0-angular`'s `AuthService` directly — so a future provider change
doesn't ripple through every feature that checks auth state.

**Manual wiring required in `app.config.ts`**: add `provideAuth0(auth0Config)`
(imported from `@auth0/auth0-angular`, config from `core/config/auth0.config.ts`) to
the providers array. `provideAuth0()` returns `EnvironmentProviders` — it can only be
used at the application/environment level (this is enforced at compile time by the
SDK itself, not something to work around).

**Already wired automatically, don't duplicate**: `provideHttpClient()` and Auth0's
functional HTTP interceptor (`authHttpInterceptorFn`) are already registered in
`app.config.ts` by the generator itself — this is a real, working provider setup, not
a placeholder. Don't add a second `provideHttpClient(...)` call or re-import the
interceptor; `provideAuth0(auth0Config)` is the only piece still needing manual
addition.

## What the AI agent may do

- Use this project's own `AuthService` (`isAuthenticated$`, `user$`, `login()`,
  `logout()`) in feature code — not `@auth0/auth0-angular`'s `AuthService` directly.
- Use Auth0's functional route guard (`authGuardFn`, imported from
  `@auth0/auth0-angular`) directly on routes needing authentication — it's already the
  correct, current, functional-style API (not the deprecated class-based `AuthGuard`).

## What the AI agent must NOT do

- **Do not edit** `core/config/auth0.config.ts` — protected by `.claude/settings.json`.
- Do not import or inject `@auth0/auth0-angular`'s `AuthService` directly in feature
  components/services — always go through this project's own `AuthService` wrapper.
- Do not use the class-based `AuthGuard`/`AuthHttpInterceptor` — those are the legacy,
  NgModule-era APIs; this project uses the functional equivalents (`authGuardFn`,
  `authHttpInterceptorFn`).
- Do not attempt to add `provideAuth0(...)` to a component's own `providers` array —
  the SDK itself prevents this at compile time (it returns `EnvironmentProviders`),
  so don't try to work around that restriction.
- Do not add a second `provideHttpClient(...)` call — one is already wired in
  `app.config.ts` with `authHttpInterceptorFn` registered.

## Where the code lives

- `src/app/core/config/auth0.config.ts` — SDK configuration (protected).
- `src/app/core/services/auth.service.ts` — this project's thin wrapper (editable).
- `src/app/app.config.ts` — `provideHttpClient(withInterceptors([authHttpInterceptorFn]))`
  is already wired; only `provideAuth0(auth0Config)` needs adding manually (see
  "Manual wiring required" above) — this file itself stays generally editable.
