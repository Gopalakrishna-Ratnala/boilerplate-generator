import { Injectable, inject } from '@angular/core';
import { AuthService as Auth0Service } from '@auth0/auth0-angular';

/**
 * Thin wrapper around Auth0's own AuthService. Feature code depends on THIS
 * service, not on @auth0/auth0-angular directly — if this project's auth
 * provider ever changes (e.g. to a different identity provider), only this
 * file needs to change, not every feature that checks auth state.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth0 = inject(Auth0Service);

  readonly isAuthenticated$ = this.auth0.isAuthenticated$;
  readonly user$ = this.auth0.user$;

  login(): void {
    this.auth0.loginWithRedirect();
  }

  logout(): void {
    this.auth0.logout({ logoutParams: { returnTo: window.location.origin } });
  }
}
