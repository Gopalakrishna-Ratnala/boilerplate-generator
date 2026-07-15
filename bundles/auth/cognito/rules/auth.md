# Auth: AWS Cognito

## What pattern is used

This project authenticates against an **existing** AWS Cognito User Pool using
`aws-amplify`'s functional v6 Auth API (`aws-amplify/auth`) — not the Amplify
CLI/backend-provisioning workflow (that assumes Amplify itself owns and manages the
Cognito resources, which isn't the case here; the user pool already exists in AWS
infrastructure set up separately). Configuration is isolated in
`core/config/cognito.config.ts` (protected). Feature code goes through this project's
own `AuthService` wrapper (`core/services/auth.service.ts`) — not `aws-amplify`
directly — so a future provider change doesn't ripple through every feature that
checks auth state.

**Manual wiring required**: call `configureCognito()` (from
`core/config/cognito.config.ts`) once, early in bootstrap — the top of `main.ts`,
before `bootstrapApplication(...)` runs. Do not call it from inside a component or
service constructor; Amplify's configuration must be set once, globally, before any
Auth API call is made.

## What the AI agent may do

- Use this project's own `AuthService` (`login()`, `logout()`, `getCurrentUser()`,
  `getAccessToken()`) in feature code — not `aws-amplify`/`aws-amplify/auth` directly.
- Use `aws-amplify/auth`'s other functional APIs (`resetPassword`,
  `confirmResetPassword`, `updatePassword`, etc.) **inside** the `AuthService` wrapper
  if a feature genuinely needs one not already exposed there — extend the wrapper,
  don't bypass it from feature code.

## What the AI agent must NOT do

- **Do not edit** `core/config/cognito.config.ts` — protected by
  `.claude/settings.json`.
- Do not import `aws-amplify`/`aws-amplify/auth` directly in feature
  components/services — always go through this project's own `AuthService` wrapper.
- Do not use any Amplify v5-style API shape (`Auth.signIn(username, password)`
  positional-argument style, `CognitoUser` return values) — this project uses v6's
  functional, named-parameter API exclusively. If you find a code example using the
  older shape, it's for a different Amplify version; don't follow it here.
- Do not attempt to provision Cognito resources via the Amplify CLI (`amplify add
  auth`, `amplify push`, etc.) — this project's user pool already exists and is
  managed outside this repo; this project is a client of it, not its owner.
- If genuinely unsure of the current exact `aws-amplify/auth` function signature for
  something not covered above, check via the Angular CLI MCP server's documentation
  search or flag it for developer review rather than guessing — this SDK's config
  shape has changed across major versions before (v5 → v6 was a full rewrite to a
  functional API), so don't assume an example found elsewhere matches this project's
  version without checking.

## Where the code lives

- `src/app/core/config/cognito.config.ts` — Amplify configuration (protected).
- `src/app/core/services/auth.service.ts` — this project's thin wrapper (editable).
- `src/main.ts` — needs `configureCognito()` called before `bootstrapApplication(...)`
  (see "Manual wiring required" above).
