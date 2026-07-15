# Auth: Basic Email/Password

## What pattern is used

This project authenticates users via email/password against its own backend. The
backend returns a JWT on successful login. The token is stored client-side and attached
to outgoing API requests automatically via an HTTP interceptor. Routes requiring login
are protected by a functional route guard.

**`provideHttpClient(withInterceptors([authInterceptor, ...]))` is already wired in
`app.config.ts`** by the generator itself — this is a real, working setup, not
something to add yourself. Don't add a second `provideHttpClient(...)` call.

## What the AI agent may do

- Use `inject(AuthService)` in any component/service that needs to know if a user is
  logged in, or needs the current user's info (`authService.currentUser()`,
  `authService.isAuthenticated()`).
- Add `authGuard` to the `canActivate` of any **new** route that should require login —
  follow the pattern already used on existing protected routes in `app.routes.ts`.
- Build login/logout/register UI that calls `authService.login(...)`,
  `authService.logout()`, etc. — the public methods already defined on `AuthService`.

## What the AI agent must NOT do

- **Do not edit** `auth.service.ts`, `auth.interceptor.ts`, or `auth.guard.ts`. These
  are protected by `.claude/settings.json` — this is not a style preference, it's the
  actual token-handling and route-protection mechanism. A bug here is a security bug.
- Do not add a second way of attaching the auth token (e.g. manually setting headers in
  a feature service). Always go through the existing interceptor.
- Do not store the token anywhere except where `AuthService` already stores it. Do not
  add a second storage location "to be safe."
- Do not add a new auth library (Auth0, Firebase Auth, etc.) — this project's pattern is
  a self-managed backend, not a third-party auth provider. If that assumption is wrong
  for this project, that's a bundle-selection question for a developer, not something to
  route around here.

## Where the code lives

- `src/app/core/services/auth.service.ts` — login/logout/register, token storage,
  current-user state (as a signal).
- `src/app/core/interceptors/auth.interceptor.ts` — attaches the token to outgoing
  requests.
- `src/app/core/guards/auth.guard.ts` — functional guard for protected routes.
