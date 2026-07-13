# Deploy Target: SPA (Client-Side Rendered)

## What pattern is used

This project is a standard client-side rendered single-page app — Angular's default.
There is no server-rendering step; the browser downloads the app bundle and renders
everything client-side.

## What the AI agent may do

- Build features normally. No special rendering-mode considerations apply.

## What the AI agent must NOT do

- Do not add `@angular/ssr`, `@angular/platform-server`, or any SSR-related
  configuration (`server.ts`, `app.config.server.ts`, `app.routes.server.ts`). This
  project's deploy-target bundle selection is SPA — if there's a real need for
  server-rendering (SEO, faster first paint on public pages), that's a bundle-selection
  question for a developer, not something to add unprompted.

## Where the code lives

N/A — no deploy-target-specific code in this project by design.
