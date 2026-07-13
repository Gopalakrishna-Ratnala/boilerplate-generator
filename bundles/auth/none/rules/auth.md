# Auth: No Authentication

## What pattern is used

This project has no login and no authenticated user concept. Every route and API call
is public.

## What the AI agent may do

- Build any feature assuming there is no logged-in user.
- Call APIs directly without attaching any auth token.

## What the AI agent must NOT do

- Do **not** add a login page, auth guard, token storage, or any auth-related
  dependency "just in case." If the project later needs auth, that's a scope change a
  developer should evaluate and re-run the generator for — not something to add
  silently mid-task.
- Do not add any `core/guards/auth*` or `core/interceptors/auth*` files. Their absence
  is intentional, not an oversight.

## Where the code lives

N/A — there is no auth code in this project by design.
