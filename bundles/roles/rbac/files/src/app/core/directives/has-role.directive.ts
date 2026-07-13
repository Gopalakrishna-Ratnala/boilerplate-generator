import { Directive, effect, inject, input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AppRole } from '../config/roles.config';

/**
 * Structural directive: shows its host template only if the current user has one of
 * the given roles.
 *
 * Usage:
 *   <button *hasRole="[APP_ROLES.ADMIN]">Delete</button>
 *
 * Requires the project's auth bundle to populate `CurrentUser.roles`. See
 * .claude/rules/roles.md.
 */
@Directive({
  selector: '[hasRole]',
})
export class HasRoleDirective {
  private readonly authService = inject(AuthService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainerRef = inject(ViewContainerRef);

  readonly hasRole = input<AppRole[]>([]);

  private rendered = false;

  constructor() {
    effect(() => {
      const requiredRoles = this.hasRole();
      const userRoles = this.authService.currentUser()?.roles ?? [];
      const shouldShow =
        requiredRoles.length === 0 || requiredRoles.some((role) => userRoles.includes(role));

      if (shouldShow && !this.rendered) {
        this.viewContainerRef.createEmbeddedView(this.templateRef);
        this.rendered = true;
      } else if (!shouldShow && this.rendered) {
        this.viewContainerRef.clear();
        this.rendered = false;
      }
    });
  }
}
