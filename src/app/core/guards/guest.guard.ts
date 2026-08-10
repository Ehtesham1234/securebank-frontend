import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/** Guards /auth/login and /auth/register — an already-logged-in user gets
 *  redirected to their dashboard instead of seeing the login form again. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.ready).pipe(
    filter((ready) => ready),
    take(1),
    map(() => (!auth.isAuthenticated() ? true : router.createUrlTree(['/dashboard']))),
  );
};
