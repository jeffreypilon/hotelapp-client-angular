import { computed } from '@angular/core';
import { signalStore, withComputed, withMethods, withState, patchState } from '@ngrx/signals';
import type { Role, User } from '../api/types';

interface SessionState {
  user: User | null;
  isResolved: boolean;
  /** Bootstrap couldn't reach the server at all; S0 shows a dismissible banner for this, not a redirect. */
  networkError: boolean;
}

const initialState: SessionState = {
  user: null,
  isResolved: false,
  networkError: false,
};

/**
 * The one genuinely global store, per state-management.md#session-state. Resolved once during
 * app initialization by SessionInitializer; every guard and the header read it afterward.
 */
export const SessionStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ user }) => ({
    role: computed<Role | null>(() => user()?.role ?? null),
    propertyId: computed<string | null>(() => user()?.propertyId ?? null),
  })),
  withMethods((store) => ({
    setUser(user: User): void {
      patchState(store, { user, isResolved: true, networkError: false });
    },
    setAnonymous(): void {
      patchState(store, { user: null, isResolved: true });
    },
    setNetworkError(): void {
      patchState(store, { user: null, isResolved: true, networkError: true });
    },
    /** Clears session AND leaves feature stores to their own route-scoped lifetime -- see logout(). */
    clear(): void {
      patchState(store, { user: null, isResolved: true, networkError: false });
    },
  })),
);
