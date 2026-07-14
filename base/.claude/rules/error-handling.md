# Error Handling (Company Standard + Angular Official Guidance)

> Source: Angular's official error-handling guide
> (angular.dev/best-practices/error-handling), plus company convention for wiring to an
> error-tracking service.

## What already exists in this project

`provideBrowserGlobalErrorListeners()` is already in `app.config.ts` — the Angular CLI
adds this by default. It forwards uncaught browser `error` and `unhandledrejection`
events to Angular's `ErrorHandler`. **Do not remove this provider.**

## The pattern for handling errors

- **Handle errors at the call site whenever possible** — a service method that calls an
  API should catch/handle failures there (`try/catch`, or RxJS `catchError`), so the
  component calling it can show a specific, useful message. Don't rely on the global
  `ErrorHandler` as your primary error-handling mechanism — it's a backstop for truly
  unexpected errors, not a substitute for handling expected failure cases (a failed
  network request is expected; handle it where it happens).
- **A custom `ErrorHandler`, if this project has one, is for reporting, not recovery.**
  Its job is to send unexpected errors to whatever error-tracking/analytics service the
  company uses — not to try to fix or route around them. If this project doesn't have a
  custom `ErrorHandler` yet and one is needed (e.g. to wire up Sentry or similar), that's
  a developer decision (which service, what data to include/exclude for privacy) — flag
  it rather than picking a service and adding credentials yourself.

## What the AI agent must NOT do

- Do not remove `provideBrowserGlobalErrorListeners()` from `app.config.ts`.
- Do not swallow errors silently (an empty `catch {}` block, or a subscribe with no
  error callback) — either handle the error meaningfully or let it propagate to the
  `ErrorHandler`.
- Do not hardcode an error-tracking service's API key/DSN directly in source — that
  belongs in `src/environments/` (already protected — see `security.md`), set by a
  developer.
- If this project is SSR (`deploy-target: ssr`), be aware the server process already has
  `unhandledRejection`/`uncaughtException` listeners added automatically — don't add a
  second, competing set of global handlers on the server side.
