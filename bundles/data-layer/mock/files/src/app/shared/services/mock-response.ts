import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

/**
 * Wraps a static value as an Observable with a small simulated network delay,
 * so components built against mock data behave the same way (loading states,
 * async pipe usage) as they will once a real backend is wired in later.
 *
 * Usage in a feature service:
 *   getUsers(): Observable<User[]> {
 *     return mockResponse(MOCK_USERS);
 *   }
 */
export function mockResponse<T>(value: T, delayMs = 300): Observable<T> {
  return of(value).pipe(delay(delayMs));
}
