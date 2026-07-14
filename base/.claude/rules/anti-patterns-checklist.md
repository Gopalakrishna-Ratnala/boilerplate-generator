# Anti-Patterns & Final Validation Checklist

> A single, skimmable summary — not new rules. Every item here is already stated in
> detail somewhere in `.claude/rules/`; this file exists so there's one place to check
> "am I actually done" without re-reading every rule file. Adapted from a pattern found
> in the company's `ai-ready-react-template`/`ai-ready-angular-template` reference
> templates.

## Anti-patterns (auto-reject)

- `console.log`/`console.warn`/`console.error` left in committed source (outside a
  deliberate, reviewed logging/error-reporting path — see `error-handling.md`).
- Commented-out code blocks left in committed files.
- Unused imports, variables, or functions.
- Raw `HttpClient` calls inside a component instead of a service (`architecture.md`).
- A hardcoded API URL/path in a service file instead of reading from the project's
  config/environment indirection (see the selected `data-layer` bundle's rule file).
- UI-only state (e.g. "is this dropdown open") stored in a shared/global store instead
  of local component state (see the selected `state` bundle's rule file).
- `@for` without a `track` expression (`angular.md`) — also hook-enforced.
- Mixing `@Input()`/`@Output()` decorators with `input()`/`output()`/`model()` signals
  in the same component (`angular.md`).
- A `<div>`/`<span>` given click/keyboard interactivity instead of a real `<button>`/`<a>`
  (`accessibility.md`) — also hook-enforced.
- Hardcoded hex/rgb/hsl color literals scattered through component styles instead of a
  central design-token source — also hook-enforced.
- Calling any `DomSanitizer.bypassSecurityTrust*` method without flagging it for human
  security review first (`security.md`).
- A new dependency added without flagging it (`security.md`) — this project's
  dependency set is fixed at generation time.
- A component placed directly under `features/` with no owning feature subfolder
  (`architecture.md`).
- Missing `.spec.ts` for a new component, service, or pipe.

## Final validation checklist

- [ ] `ng lint` exits with 0 errors
- [ ] `ng test` passes
- [ ] `ng build` succeeds
- [ ] `npx tsc --noEmit` exits with 0 errors
- [ ] No explicit `any`
- [ ] No interactive `<div>`/`<span>` used where a real element belongs
- [ ] No hardcoded color values outside the project's design-token source
- [ ] No raw `HttpClient` calls in a component
- [ ] Every `@for` has `track`
- [ ] Every new component/service/pipe has a co-located `.spec.ts`
- [ ] No environment-specific values baked into source (`security.md`)
- [ ] No secrets or API keys committed anywhere in `src/`
- [ ] `npm audit` reports zero vulnerabilities before pushing — also hook-enforced on
      `git commit`
