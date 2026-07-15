# E2E Testing: Playwright

## What pattern is used

This project uses Playwright (`@playwright/test`) for end-to-end testing, installed
statically (deps + config committed directly) rather than via the interactive `npm
init playwright@latest` initializer — avoids an interactive prompt this generator's
non-interactive pipeline can't answer. `playwright.config.ts` (protected) wires
Playwright to start `ng serve` automatically and run tests against
`http://localhost:4200`.

## What the AI agent may do

- Add new e2e test files under `e2e/`, following the existing `example.spec.ts`'s
  pattern (`import { test, expect } from '@playwright/test'`).
- Use Playwright's locator API (`page.getByRole(...)`, `page.getByLabel(...)`,
  `page.getByTestId(...)`) — these are Playwright's own recommended, resilient
  selectors. Prefer them over raw CSS selectors, which break more easily on markup
  changes.
- Run tests with `npx playwright test` (starts `ng serve` automatically per the
  config's `webServer` block — no need to manually start the dev server first).

## What the AI agent must NOT do

- **Do not edit** `playwright.config.ts` — protected by `.claude/settings.json`, same
  treatment as `angular.json`/`eslint.config.js`. Flag a needed change for a developer.
- Do not duplicate coverage already handled by this project's unit tests
  (`.claude/rules/angular.md`) — e2e tests are for real user flows across multiple
  pages/components working together, not a substitute for component-level unit tests.
- Do not write e2e tests that depend on a specific backend state existing (a specific
  user already existing, specific seed data) unless this project's `data-layer` bundle
  is `mock` — for real backends, either mock the network layer
  (`page.route(...)`) or flag the need for a dedicated test-data setup to a developer.

## Where the code lives

- `e2e/` — Playwright test files.
- `playwright.config.ts` — configuration (protected).
