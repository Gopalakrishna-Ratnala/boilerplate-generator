# Offline: Standard (No PWA)

## What pattern is used

This project has no service worker and no offline caching. It requires an active
network connection to function.

## What the AI agent may do

- Build features assuming network availability. Handle network *failures* gracefully
  (loading/error states), but there's no offline-mode fallback to build for.

## What the AI agent must NOT do

- Do not add `@angular/service-worker` or any offline-caching library "just in case."
  If offline support becomes a real requirement, that's a bundle-selection change for a
  developer (re-running the generator's `offline` axis as `pwa`), not something to add
  mid-task.

## Where the code lives

N/A — no offline/PWA code in this project by design.
