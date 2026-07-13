# Auth: Enterprise SAML / IdP

## What pattern is used

This project uses enterprise SAML SSO. **The SAML protocol itself — assertions, XML
signing, certificates — is handled entirely by the backend.** The Angular frontend never
parses or processes SAML data. It only redirects the browser to the backend's
SSO-initiation endpoint, then checks a session (via an httpOnly cookie the backend sets)
to know if the user is logged in.

## What the AI agent may do

- Use `inject(AuthService)` to check `isAuthenticated()` / `currentUser()` /
  `sessionChecked()`.
- Call `authService.login()` (redirects to the backend) or `authService.logout()` from
  UI.
- Add `authGuard` to `canActivate` on new routes that require login.

## What the AI agent must NOT do

- **Never add a SAML-processing library to the frontend** (e.g. anything that parses
  SAML XML or handles certificates in the browser). If a task seems to need this, the
  premise is wrong — SAML processing belongs on the backend, always. Flag it rather than
  implementing it.
- **Do not edit** `auth.service.ts` or `auth.guard.ts` — protected by
  `.claude/settings.json`.
- Do not try to read or store the session token/cookie manually in JavaScript — it's
  httpOnly by design specifically so client-side code (including this AI agent) cannot
  read it. Rely only on the `/api/auth/session` endpoint's response.
- Do not add a second login mechanism (basic auth form, OAuth button) alongside SAML
  without a developer decision to do so — this bundle assumes SAML is the *only* login
  path.

## Where the code lives

- `src/app/core/services/auth.service.ts` — session check, login redirect, logout.
- `src/app/core/guards/auth.guard.ts` — functional guard for protected routes.
- (Backend, not in this repo) — SAML assertion consumption, IdP metadata, session
  cookie issuance.
