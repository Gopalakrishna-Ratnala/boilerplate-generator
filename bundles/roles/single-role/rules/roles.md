# Roles: Single Role

## What pattern is used

Every logged-in user (if this project has auth at all — see the selected `auth` bundle)
has identical permissions. There is no concept of roles, permission checks, or
role-gated UI/routes in this project.

## What the AI agent may do

- Build any feature assuming every authenticated user can see/do everything a logged-in
  user can.

## What the AI agent must NOT do

- Do not add role checks, a permissions model, or role-gated routes/UI "just in case."
  If a task genuinely seems to need this, that's a scope change for a developer to
  evaluate (this project's roles bundle would need to change to `rbac`) — not something
  to add silently mid-task.
- Do not add a `roles` field to any user-facing type or check `currentUser()?.roles`
  anywhere — this project's auth `CurrentUser` type may technically have an optional
  `roles` field (present for cross-bundle consistency), but it is intentionally unused
  here.

## Where the code lives

N/A — there is no role-based code in this project by design.
