import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiBaseUrl } from '../config/api.config';

/**
 * Shared base for REST calls. Feature services should inject this rather
 * than injecting HttpClient directly, so the base URL and request shape stay
 * consistent across the whole app. See .claude/rules/data-layer.md.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(path: string, params?: Record<string, string | number | boolean>): Observable<T> {
    return this.http.get<T>(this.url(path), { params: this.toHttpParams(params) });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(this.url(path), body);
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }

  private url(path: string): string {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${apiBaseUrl}/${cleanPath}`;
  }

  private toHttpParams(params?: Record<string, string | number | boolean>): HttpParams {
    let httpParams = new HttpParams();
    if (!params) {
      return httpParams;
    }
    for (const [key, value] of Object.entries(params)) {
      httpParams = httpParams.set(key, String(value));
    }
    return httpParams;
  }
}
