import { HttpContext, HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorResponse, KnownErrorCode } from '../models/api-response.model';
import { NotificationService } from '../services/notification.service';

export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

/**
 * Opt a request out of interceptor-level error toasts entirely — for calls
 * where an "error" response is actually a normal, expected state the
 * caller already handles itself (e.g. GET /kyc/status 404-ing because the
 * user hasn't submitted yet). Unlike SILENT_CODES below (which is a fixed
 * list this file owns), this is per-request and decided by the caller:
 *
 *   this.http.get(url, { context: withSilentErrors() })
 */
export function withSilentErrors(context = new HttpContext()): HttpContext {
  return context.set(SILENT_ERRORS, true);
}

/**
 * Friendlier toast titles for specific backend error codes. Anything not
 * listed here falls back to a generic title with the backend's own message
 * as the detail — every exception in GlobalExceptionHandler already carries
 * a human-readable message, so we don't need to invent copy for most cases.
 */
const TITLES: Partial<Record<KnownErrorCode, string>> = {
  RATE_LIMIT_EXCEEDED: 'Slow down',
  ACCOUNT_LOCKED: 'Account locked',
  ACCOUNT_SUSPENDED: 'Account suspended',
  ACCOUNT_CLOSED: 'Account closed',
  EMAIL_NOT_VERIFIED: 'Verify your email',
  INVALID_OTP: 'Invalid code',
  TOKEN_REUSE_DETECTED: 'Security alert',
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  RESOURCE_NOT_FOUND: 'Not found',
  // kyc-service spells the same concept "NOT_FOUND" instead of
  // securebank-api's "RESOURCE_NOT_FOUND" — a real inconsistency between
  // services, not a typo here. Both map to the same title.
  NOT_FOUND: 'Not found',
  CONCURRENT_MODIFICATION: 'Please retry',
  CONFLICT: 'Already exists',
};

/** Errors a component is expected to catch and render inline — the
 *  interceptor stays quiet for these so the user doesn't see both a toast
 *  AND a field-level message for the same problem. */
const SILENT_CODES: KnownErrorCode[] = ['VALIDATION_FAILED'];

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) => {
      if (req.context.get(SILENT_ERRORS)) {
        return throwError(() => err);
      }

      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }

      // Client-side/network failure — no server response at all.
      if (err.status === 0) {
        inject(NotificationService).error(
          "Can't reach SecureBank right now. Check your connection and try again.",
          'Connection problem',
        );
        return throwError(() => err);
      }

      // 401s are handled entirely by the auth interceptor (silent refresh,
      // or redirect to login) — don't double up with a toast here.
      if (err.status === 401) {
        return throwError(() => err);
      }

      const body = err.error as ErrorResponse | undefined;
      const code = body?.error as KnownErrorCode | undefined;

      if (code && SILENT_CODES.includes(code)) {
        return throwError(() => err);
      }

      const title = (code && TITLES[code]) ?? 'Something went wrong';
      const detail = body?.message ?? 'Please try again in a moment.';
      inject(NotificationService).error(detail, title);

      return throwError(() => err);
    }),
  );
