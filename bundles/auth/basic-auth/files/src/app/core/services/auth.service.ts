import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

interface LoginResponse {
  token: string;
  user: CurrentUser;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  /** Present only if this project's roles bundle is 'rbac'. Empty/absent otherwise. */
  roles?: string[];
}

const TOKEN_STORAGE_KEY = 'auth_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  // Found via a real test report: this service is providedIn: 'root', so it's
  // eagerly instantiated — including during SSR prerendering, where `localStorage`
  // doesn't exist (it's a browser-only global). Guard every access with
  // isPlatformBrowser(), the standard Angular pattern for this exact situation —
  // don't access localStorage directly anywhere in this file.
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly tokenSignal = signal<string | null>(this.readStoredToken());
  private readonly currentUserSignal = signal<CurrentUser | null>(null);

  readonly isAuthenticated = computed(() => this.tokenSignal() !== null);
  readonly currentUser = computed(() => this.currentUserSignal());

  token(): string | null {
    return this.tokenSignal();
  }

  async login(email: string, password: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>('/api/auth/login', { email, password }),
    );
    this.setSession(response.token, response.user);
  }

  async register(email: string, password: string, name: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>('/api/auth/register', { email, password, name }),
    );
    this.setSession(response.token, response.user);
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.currentUserSignal.set(null);
    if (this.isBrowser) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    this.router.navigateByUrl('/login');
  }

  private setSession(token: string, user: CurrentUser): void {
    this.tokenSignal.set(token);
    this.currentUserSignal.set(user);
    if (this.isBrowser) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  }

  private readStoredToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }
}
