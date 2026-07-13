import { Injectable, computed, inject, signal } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { oauthConfig } from '../config/oauth.config';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
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
    const claims = this.oauthService.getIdentityClaims() as Record<string, string> | null;
    if (!claims) {
      return;
    }
    this.currentUserSignal.set({
      id: claims['sub'],
      email: claims['email'],
      name: claims['name'],
    });
  }
}
