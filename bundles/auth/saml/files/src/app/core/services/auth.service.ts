import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
}

/**
 * SAML auth is entirely handled server-side. This service does NOT process SAML
 * assertions, XML, or certificates in the browser — that would be a serious
 * security anti-pattern. It only:
 *  - redirects the browser to the backend's SAML login-initiation endpoint
 *  - asks the backend "who am I" (relying on the httpOnly session cookie the
 *    backend set after a successful SAML assertion)
 *  - tells the backend to end the session on logout
 *
 * See .claude/rules/auth.md before changing anything here.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentUserSignal = signal<CurrentUser | null>(null);
  private readonly checkedSignal = signal(false);

  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly sessionChecked = computed(() => this.checkedSignal());

  /** Call once on app start to see if an existing session cookie is valid. */
  async checkSession(): Promise<void> {
    try {
      const user = await firstValueFrom(
        this.http.get<CurrentUser>('/api/auth/session', { withCredentials: true }),
      );
      this.currentUserSignal.set(user);
    } catch {
      this.currentUserSignal.set(null);
    } finally {
      this.checkedSignal.set(true);
    }
  }

  /** Redirects the browser to the backend, which starts the SAML flow with the IdP. */
  login(): void {
    window.location.href = '/api/auth/saml/login';
  }

  async logout(): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/auth/saml/logout', {}, { withCredentials: true }),
    );
    this.currentUserSignal.set(null);
    window.location.href = '/login';
  }
}
