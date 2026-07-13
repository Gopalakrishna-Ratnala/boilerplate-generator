/**
 * Canonical list of roles for this project. This is the single source of truth —
 * the guard and directive below both check against role strings; any role literal
 * used anywhere in the app should come from here, not be typed as a raw string.
 *
 * Developer-maintained. Not something to add to ad hoc from a feature task — if a
 * feature seems to need a new role, that's a decision for whoever owns this file.
 */
export const APP_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];
