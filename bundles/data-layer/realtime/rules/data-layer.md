# Data Layer: Real-time (WebSocket)

## What pattern is used

This project maintains a single live socket connection (via `socket.io-client`),
wrapped in a shared `RealtimeService`. Connection state is exposed as a signal
(`connected()`). Features subscribe to named server events via `on<T>(eventName)`
(returns an `Observable<T>`) and send events via `emit(eventName, payload)`.

## What the AI agent may do

- Inject `RealtimeService` in a feature service/component and call
  `realtimeService.on<SomeType>('event-name')` to react to server events, or
  `realtimeService.emit('event-name', payload)` to send one.
- Call `realtimeService.connect()` once, typically at app startup or on login — check
  `app.config.ts`/`app.ts` for where this project already does it before adding a second
  call site.

## What the AI agent must NOT do

- **Do not edit** `realtime.service.ts` or `realtime.config.ts` — protected by
  `.claude/settings.json`. This is the one socket connection the whole app shares;
  changing it affects every feature using real-time data.
- **Do not create a second socket connection** (e.g. calling `io(...)` directly inside a
  feature). There should be exactly one socket for the whole app.
- Do not hardcode the socket server URL in a feature file — it comes from
  `realtime.config.ts` / `environment.ts`.
- Remember to unsubscribe from `on<T>()` observables when a component is destroyed
  (e.g. via `takeUntilDestroyed()`) — the wrapper cleans up the underlying socket
  listener via its returned teardown function, but the Angular subscription itself
  still needs normal cleanup.

## Where the code lives

- `src/app/core/config/realtime.config.ts` — socket server URL (protected).
- `src/app/core/services/realtime.service.ts` — shared socket wrapper (protected).
- `src/app/features/<feature>/` — feature code that subscribes/emits via
  `RealtimeService`.
