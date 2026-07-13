# Auth: OAuth / SSO

## What pattern is used

This project authenticates users via an external identity provider (Google, Microsoft
Entra ID, Okta, etc.) using OAuth2/OIDC, via `angular-oauth2-oidc`. There is no
self-managed password — login is entirely delegated to the identity provider.

## What the AI agent may do

- Use `inject(AuthService)` to check `isAuthenticated()` or read `currentUser()`.
- Add `authGuard` to the `canActivate` of any **new** route that should require login.
- Call `authService.login()` / `authService.logout()` from UI (e.g. a "Sign in with
  Google" button, a logout menu item).

## What the AI agent must NOT do

- **Do not edit** `auth.service.ts`, `auth.guard.ts`, or `oauth.config.ts` — all three
  are protected by `.claude/settings.json`.
- **Never fill in or change `issuer`, `clientId`, or `redirectUri`** in
  `oauth.config.ts`. These are set once by a developer from the identity provider's
  actual configuration — a placeholder value here is not something to "helpfully" guess
  a real-looking value for.
- Do not add a second auth library (basic email/password, a different OAuth wrapper,
  etc.) — this project's identity source is the configured external provider, not a
  self-managed backend.
- Do not log or print the access token, ID token, or any claims beyond what
  `currentUser()` already exposes.

## Where the code lives

- `src/app/core/config/oauth.config.ts` — issuer/client config (developer-filled,
  protected).
- `src/app/core/services/auth.service.ts` — wraps `angular-oauth2-oidc`'s `OAuthService`
  with this project's `isAuthenticated()`/`currentUser()`/`login()`/`logout()` API.
- `src/app/core/guards/auth.guard.ts` — functional guard for protected routes.
