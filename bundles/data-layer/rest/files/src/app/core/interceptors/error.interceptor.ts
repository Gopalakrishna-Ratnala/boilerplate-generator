import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Centralized HTTP error normalization. Feature code should NOT add its own
 * try/catch-equivalent error handling for network errors — catch specific,
 * feature-relevant errors in the component/service if needed, but let this
 * interceptor handle logging/normalizing the underlying HTTP error shape.
 * See .claude/rules/data-layer.md.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const normalized = {
        status: error.status,
        message: error.error?.message ?? error.message ?? 'Unknown API error',
        url: req.url,
      };
      // eslint-disable-next-line no-console
      console.error('[API Error]', normalized);
      return throwError(() => normalized);
    }),
  );
};
