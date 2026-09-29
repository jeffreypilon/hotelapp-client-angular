import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../core/session/session.store';
import { roleRank } from './role-rank';

/**
 * Guards Manager-only `/admin` sub-routes. Not nested under `staffGuard` in a route tree yet --
 * no admin routes are wired -- so this checks both authentication and the Manager rank floor
 * itself rather than assuming `staffGuard` already ran, per AC-AZ-06's rank-not-membership rule.
 * When the admin route tree is built, `staffGuard` will already guarantee the staff-rank floor;
 * this guard is the one already proven to admit only Manager on top of that.
 */
export const managerGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const user = session.user();
  if (!user) {
    return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
  }
  if (roleRank[user.role] < roleRank.PROPERTY_MANAGER) {
    return router.createUrlTree(['/']);
  }
  return true;
};
