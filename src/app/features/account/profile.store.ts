import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { MeApi } from '../../core/api/me.api';
import { ApiError } from '../../core/api/api-error';
import { SessionStore } from '../../core/session/session.store';
import type { ChangePasswordRequest, PatchProfileRequest, Profile } from '../../core/api/types';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';
type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

interface ProfileState {
  profile: Profile | null;
  status: LoadStatus;
  error: ApiError | null;

  mutationStatus: MutationStatus;
  mutationError: ApiError | null;
}

const initialState: ProfileState = {
  profile: null,
  status: 'idle',
  error: null,

  mutationStatus: 'idle',
  mutationError: null,
};

/**
 * Backs S8a and S8d, per state-management.md's `ProfileStore` entry -- route-provided. `PATCH /me`
 * reloads this store's own `profile` AND `SessionStore` (the header's user-area reads `firstName`
 * from the session, not from here, per state-management.md's post-mutation-reloads table).
 * `PUT /me/password` reloads nothing -- the caller's own session stays valid.
 */
export const ProfileStore = signalStore(
  withState(initialState),

  withComputed(({ status, mutationStatus }) => ({
    isLoading: computed(() => status() === 'idle' || status() === 'loading'),
    isError: computed(() => status() === 'error'),
    isMutating: computed(() => mutationStatus() === 'pending'),
  })),

  withMethods((store, api = inject(MeApi), session = inject(SessionStore)) => {
    const loadProfile = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { status: 'loading', error: null })),
        switchMap(() =>
          api.getProfile().pipe(
            tapResponse({
              next: (profile) => patchState(store, { profile, status: 'success' }),
              error: (error: ApiError) => patchState(store, { status: 'error', error }),
            }),
          ),
        ),
      ),
    );

    return {
      loadProfile,

      patchProfile(body: PatchProfileRequest): Promise<Profile> {
        patchState(store, { mutationStatus: 'pending', mutationError: null });
        return new Promise((resolve, reject) => {
          api.patchProfile(body).subscribe({
            next: (profile) => {
              patchState(store, { profile, mutationStatus: 'success' });
              const user = session.user();
              if (user) {
                session.setUser({
                  ...user,
                  firstName: profile.firstName,
                  lastName: profile.lastName,
                });
              }
              resolve(profile);
            },
            error: (error: ApiError) => {
              patchState(store, { mutationStatus: 'error', mutationError: error });
              reject(error);
            },
          });
        });
      },

      changePassword(body: ChangePasswordRequest): Promise<void> {
        patchState(store, { mutationStatus: 'pending', mutationError: null });
        return new Promise((resolve, reject) => {
          api.changePassword(body).subscribe({
            next: () => {
              patchState(store, { mutationStatus: 'success' });
              resolve();
            },
            error: (error: ApiError) => {
              patchState(store, { mutationStatus: 'error', mutationError: error });
              reject(error);
            },
          });
        });
      },

      resetMutation(): void {
        patchState(store, { mutationStatus: 'idle', mutationError: null });
      },
    };
  }),
);
