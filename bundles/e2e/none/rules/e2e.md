# E2E Testing: None

This project has no end-to-end (whole-app, real-browser) testing layer scaffolded —
unit tests (`.spec.ts`, per `.claude/rules/angular.md`) are the only automated test
coverage. If a task specifically calls for e2e coverage, flag it for a developer to
add deliberately (Angular's own `ng e2e` offers Cypress, Playwright, WebdriverIO,
Nightwatch, or Puppeteer — there's no single default, it's a real project decision)
rather than improvising one inline.
