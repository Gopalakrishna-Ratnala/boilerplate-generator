import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AppRole } from '../config/roles.config';

/**
 * Protects a route by required role(s). Usage on a route:
 *   { path: 'admin', canActivate: [roleGuard], data: { roles: [APP_ROLES.ADMIN] } }
 *
 * Requires the project's auth bundle to populate `CurrentUser.roles`. See
 * .claude/rules/roles.md.
 */
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = (route.data['roles'] as AppRole[] | undefined) ?? [];
  const userRoles = authService.currentUser()?.roles ?? [];

  const hasRequiredRole =
    requiredRoles.length === 0 || requiredRoles.some((role) => userRoles.includes(role));

  if (hasRequiredRole) {
    return true;
  }

  router.navigateByUrl('/forbidden');
  return false;
};
