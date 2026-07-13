import { Injectable, computed, inject, signal } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { oauthConfig } from '../config/oauth.config';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  /** Present only if this project's roles bundle is 'rbac'. Empty/absent otherwise. */
  roles?: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly oauthService = inject(OAuthService);

  private readonly currentUserSignal = signal<CurrentUser | null>(null);

  readonly isAuthenticated = computed(() => this.oauthService.hasValidAccessToken());
  readonly currentUser = computed(() => this.currentUserSignal());

  async initialize(): Promise<void> {
    this.oauthService.configure(oauthConfig);
    await this.oauthService.loadDiscoveryDocumentAndTryLogin();

    if (this.oauthService.hasValidAccessToken()) {
      this.loadUserProfile();
    }
  }

  login(): void {
    this.oauthService.initCodeFlow();
  }

  logout(): void {
    this.currentUserSignal.set(null);
    this.oauthService.logOut();
  }

  token(): string | null {
    return this.oauthService.getAccessToken() || null;
  }

  private loadUserProfile(): void {
    const claims = this.oauthService.getIdentityClaims() as Record<string, unknown> | null;
    if (!claims) {
      return;
    }
    const rawRoles = claims['roles'];
    this.currentUserSignal.set({
      id: claims['sub'] as string,
      email: claims['email'] as string,
      name: claims['name'] as string,
      roles: Array.isArray(rawRoles) ? (rawRoles as string[]) : undefined,
    });
  }
}
