import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Blocks PENDING_KYC customers from routes that need an ACTIVE account.
 * account-service's own GatewayAuthFilter already rejects every request
 * from a PENDING_KYC user with a 403 — this guard doesn't replace that
 * enforcement, it just avoids sending them into a screen that would fail
 * every API call, in favor of a clean redirect to finish KYC first.
 *
 * Pair with authGuard (and usually roleGuard) on the same route.
 */
export const activeStatusGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.currentUser();

  if (user?.userStatus === 'PENDING_KYC') {
    return router.createUrlTree(['/kyc']);
  }
  return true;
};