# Data Layer: GraphQL

## What pattern is used

This project talks to a GraphQL backend via Apollo Angular. The Apollo Client
(cache + HTTP link) is configured once in `graphql.config.ts` and provided app-wide.
Feature code uses Apollo Angular's own `Apollo` service (injectable) to run
queries/mutations — there is no extra custom wrapper on top of it, because `Apollo` is
already the shared abstraction.

## What the AI agent may do

- Inject Apollo Angular's `Apollo` service in a feature service and define
  queries/mutations using `gql` template literals, following Apollo Angular's standard
  usage.
- Define feature-specific `.ts` files for a feature's GraphQL documents (queries,
  mutations, fragments) inside that feature's `services/` or a `graphql/` subfolder.
- Use Apollo's built-in cache behavior (e.g. `watchQuery`, `refetch`) rather than
  building custom cache-invalidation logic.

## What the AI agent must NOT do

- **Do not edit** `graphql.config.ts` — protected by `.claude/settings.json`. The cache
  configuration and link chain here affect every query in the app; changing it can
  silently break caching behavior everywhere.
- Do not add a second GraphQL client library or call the GraphQL endpoint with plain
  `HttpClient` "just this once" — always go through Apollo.
- Do not hardcode the GraphQL endpoint URL in a feature file — it's set once in
  `environment.ts` and read by `graphql.config.ts`.

## Where the code lives

- `src/app/core/config/graphql.config.ts` — Apollo Client setup (protected).
- `src/app/features/<feature>/` — feature-specific GraphQL documents and the services
  that use Apollo's `Apollo` service to run them.
