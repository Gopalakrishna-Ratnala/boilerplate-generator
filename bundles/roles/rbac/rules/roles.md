# Roles: Role-Based Access Control

## What pattern is used

This project has multiple roles with different access to routes and UI. The canonical
role list lives in `roles.config.ts`. Route-level access is enforced by `roleGuard`
(reads `route.data['roles']`). UI-level visibility is controlled by the `*hasRole`
structural directive. Both read role membership from
`AuthService.currentUser()?.roles`.

**This depends on the project's `auth` bundle populating `CurrentUser.roles`.** If the
project's auth pattern is OAuth/SSO, the role claim name assumed by default
(`claims['roles']`) is a common default but **varies by identity provider** — a
developer may need to adjust which claim `auth.service.ts` reads roles from once the
actual IdP is known. That's a developer task, not something to guess/change here.

## What the AI agent may do

- Add `canActivate: [roleGuard]` and `data: { roles: [APP_ROLES.SOME_ROLE] }` to any
  **new** route that should be role-gated, using role constants from `roles.config.ts`
  — never a raw string literal for a role name.
- Use `*hasRole="[APP_ROLES.SOME_ROLE]"` on any template element that should only render
  for certain roles.
- Add a `/forbidden` page/component if one doesn't exist yet (the guard redirects there
  on a failed role check) — a plain, simple "you don't have access" page.

## What the AI agent must NOT do

- **Do not edit** `roles.config.ts`, `role.guard.ts`, or `has-role.directive.ts` —
  protected by `.claude/settings.json`. Adding a new role, or changing how role
  matching works, affects every gated route/element in the app.
- Do not use a raw string for a role anywhere (`data: { roles: ['admin'] }`) — always
  import from `APP_ROLES` in `roles.config.ts`, so a typo becomes a compile error, not a
  silent access-control bug.
- Do not implement role checks by hand in a component (e.g. `if (user.roles.includes(...))`
  scattered around) instead of using `roleGuard`/`*hasRole` — two different
  role-checking mechanisms in the same app is exactly the "inconsistent architecture"
  risk this guardrail exists to prevent.
- Do not add a role to `roles.config.ts` "just in case" a feature might need it — new
  roles are a developer decision (a new role means new questions about what it can
  access everywhere else in the app, not just the one feature being built).

## Where the code lives

- `src/app/core/config/roles.config.ts` — the canonical role list (protected).
- `src/app/core/guards/role.guard.ts` — route-level enforcement (protected).
- `src/app/core/directives/has-role.directive.ts` — UI-level visibility (protected).
- `src/app/core/services/auth.service.ts` (from the selected `auth` bundle) — the source
  of `currentUser().roles`.
