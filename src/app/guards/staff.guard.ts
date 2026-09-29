import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../core/session/session.store';
import { roleRank } from './role-rank';

/**
 * Guards `/admin`, per architecture-specification.md's routing table. Compares **rank**
 * (`>= FRONT_DESK_STAFF`), never set membership, so a Manager passes without being separately
 * enumerated, per api-contracts.md#authorization and AC-AZ-06. Not wired to any route yet --
 * `/admin` doesn't exist until the deferred admin phase -- but provable now by direct test, the
 * same "built, tested, unwired" pattern the React client's Step 4 used.
 */
export const staffGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  const user = session.user();
  if (!user) {
    return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
  }
  if (roleRank[user.role] < roleRank.FRONT_DESK_STAFF) {
    return router.createUrlTree(['/']);
  }
  return true;
};
