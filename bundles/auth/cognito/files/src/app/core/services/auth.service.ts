import { Injectable } from '@angular/core';
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

/**
 * Thin wrapper around aws-amplify's functional v6 Auth API. Feature code depends
 * on THIS service, not on aws-amplify directly — if this project's auth provider
 * ever changes, only this file needs to change, not every feature that checks
 * auth state.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  async login(username: string, password: string) {
    return signIn({ username, password });
  }

  async logout(): Promise<void> {
    await signOut();
  }

  async getCurrentUser() {
    try {
      return await getCurrentUser();
    } catch {
      return null;
    }
  }

  async getAccessToken(): Promise<string | undefined> {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString();
  }
}
