import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/enums';

/**
 * Restricts a route to one or more roles. Always pair with authGuard on the
 * same route (or an ancestor) — this guard assumes a session already exists
 * and just checks the role on it; it does not itself handle "not logged in".
 *
 *   { path: 'admin', canActivate: [authGuard, roleGuard('ADMIN')], ... }
 */
export function roleGuard(...allowedRoles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const user = auth.currentUser();

    if (user && allowedRoles.includes(user.role)) {
      return true;
    }
    return router.createUrlTree(['/dashboard']);
  };
}
