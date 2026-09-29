import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../core/session/session.store';

/**
 * Per architecture-specification.md's exact code sample. No `isResolved` check is needed here --
 * `provideAppInitializer` resolves the session before the first route activates, so this guard
 * structurally cannot run against an unresolved session (a real advantage over the React client's
 * `RequireAuth`, which has to wait on `isResolved` explicitly). Guards are UX only; the API is the
 * real access control.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);
  if (session.user()) return true;
  return router.createUrlTree(['/login'], { queryParams: { next: state.url } });
};
