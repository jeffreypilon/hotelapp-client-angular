import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { env } from '../config/env';
import { Logger } from '../../shared/util/logger';
import { ApiError, type FieldError } from './api-error';

/** Set on the bootstrap GET /auth/me request so its 401 doesn't trigger the dead-session redirect. */
export const SUPPRESS_AUTH_REDIRECT = new HttpContextToken<boolean>(() => false);

interface ProblemDetails {
  code: string;
  detail: string;
  traceId?: string;
  errors?: FieldError[];
}

/**
 * api-contracts.md documents that a 429 carries `Retry-After` but not which of the two HTTP-legal
 * forms (delta-seconds or an HTTP-date) it uses. Every response observed from both backends so
 * far is delta-seconds, so that's the only form parsed; an HTTP-date value would fail `Number()`
 * and fall through to `undefined` rather than throw, degrading to "no countdown shown" instead of
 * a crash.
 */
function parseRetryAfter(header: string | null): number | undefined {
  if (header === null) return undefined;
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

/**
 * The one place HTTP is touched, per architecture-specification.md. Prefixes the API base URL,
 * forces credentials on every request, maps problem+json bodies into a typed ApiError, applies
 * the global 401/ACCOUNT_INACTIVE rule, and logs a debug line per request -- never the body.
 *
 * The bootstrap GET /auth/me is exempted from the redirect rule via its own `context` token (see
 * session.initializer.ts): a 401 there is the expected anonymous answer, not a dead session.
 */
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const logger = inject(Logger);

  const isApiRequest = req.url.startsWith('/') && !req.url.startsWith('//');
  const apiReq = isApiRequest
    ? req.clone({ url: `${env.apiBaseUrl}${req.url}`, withCredentials: true })
    : req.clone({ withCredentials: true });

  const startedAt = performance.now();

  return next(apiReq).pipe(
    tap((event) => {
      if (event.type === 4 /* HttpEventType.Response */) {
        logger.debug('api request', {
          method: apiReq.method,
          path: req.url,
          status: (event as { status?: number }).status,
          durationMs: Math.round(performance.now() - startedAt),
        });
      }
    }),
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      if (err.status === 0) {
        logger.debug('api request failed (network error)', {
          method: apiReq.method,
          path: req.url,
          durationMs: Math.round(performance.now() - startedAt),
        });
        return throwError(
          () => new ApiError(0, 'NETWORK_ERROR', 'The request could not be completed.'),
        );
      }

      logger.debug('api request', {
        method: apiReq.method,
        path: req.url,
        status: err.status,
        durationMs: Math.round(performance.now() - startedAt),
      });

      const problem = isProblemDetails(err.error) ? err.error : undefined;
      const apiError = new ApiError(
        err.status,
        problem?.code ?? 'UNKNOWN_ERROR',
        problem?.detail ?? err.statusText,
        problem?.traceId,
        problem?.errors,
        parseRetryAfter(err.headers?.get('Retry-After') ?? null),
      );

      const isDeadSession =
        apiError.code === 'AUTHENTICATION_REQUIRED' || apiError.code === 'ACCOUNT_INACTIVE';
      const isBootstrapCall = req.context.get(SUPPRESS_AUTH_REDIRECT);
      if (isDeadSession && !isBootstrapCall) {
        const next = window.location.pathname + window.location.search;
        void router.navigate(['/login'], { queryParams: { next } });
      }

      return throwError(() => apiError);
    }),
  );
};

function isProblemDetails(value: unknown): value is ProblemDetails {
  return !!value && typeof value === 'object' && 'code' in value && 'detail' in value;
}
