import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protects a route from unauthenticated access. Relies on AuthService.checkSession()
 * having been called at app startup (see app.config.ts APP_INITIALIZER). See
 * .claude/rules/auth.md.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);

  if (authService.isAuthenticated()) {
    return true;
  }

  authService.login();
  return false;
};
