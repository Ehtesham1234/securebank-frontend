import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

/** Requests to these auth endpoints never carry a Bearer token and never
 *  trigger the refresh-and-retry flow on 401 — a bad login/refresh attempt
 *  is a normal rejected credential, not an expired session. */
const AUTH_FREE_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/email/send-otp',
  '/auth/email/verify',
];

// Module-level (one per app instance) so concurrent 401s share a single
// in-flight refresh call instead of each firing their own.
let refreshInFlight$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokens = inject(TokenStorageService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const isAuthFree = AUTH_FREE_PATHS.some((path) => req.url.includes(path));
  const accessToken = tokens.getAccessToken();

  const authedReq =
    accessToken && !isAuthFree
      ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } })
      : req;

  return next(authedReq).pipe(
    catchError((err: unknown) => {
      const isUnauthorized = err instanceof HttpErrorResponse && err.status === 401;
      if (!isUnauthorized || isAuthFree) {
        return throwError(() => err);
      }
      return handleUnauthorized(authedReq, next, auth, tokens, router).pipe(
        catchError(() => throwError(() => err)),
      );
    }),
  );
};

function handleUnauthorized(
  originalReq: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  tokens: TokenStorageService,
  router: Router,
) {
  if (!tokens.getRefreshToken()) {
    void router.navigate(['/auth/login']);
    return throwError(() => new Error('Session expired — please log in again.'));
  }

  if (!refreshInFlight$) {
    refreshInFlight$ = auth.refreshAccessToken().pipe(
      map((res) => res.accessToken),
      shareReplay(1),
      finalize(() => {
        refreshInFlight$ = null;
      }),
    );
  }

  return refreshInFlight$.pipe(
    switchMap((newAccessToken) =>
      next(originalReq.clone({ setHeaders: { Authorization: `Bearer ${newAccessToken}` } })),
    ),
    catchError((refreshErr) => {
      tokens.clear();
      void router.navigate(['/auth/login']);
      return throwError(() => refreshErr);
    }),
  );
}
