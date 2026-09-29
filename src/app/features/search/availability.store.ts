import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { inject } from '@angular/core';
import { AvailabilityApi, type GetAvailabilityParams } from '../../core/api/availability.api';
import { ApiError } from '../../core/api/api-error';
import type { AvailabilityResult, Pagination } from '../../core/api/types';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

interface AvailabilityState {
  results: AvailabilityResult[];
  pagination: Pagination | null;
  status: LoadStatus;
  error: ApiError | null;
}

const initialState: AvailabilityState = {
  results: [],
  pagination: null,
  status: 'idle',
  error: null,
};

/**
 * Backs S3, per state-management.md's `AvailabilityStore` entry. Route-provided (like
 * PropertiesStore), so re-entering the search screen naturally refetches -- this store's search
 * result is never cached across visits, matching the React client's `staleTime: 0` for this one
 * query (per state-management.md, availability must never serve a cached answer).
 */
export const AvailabilityStore = signalStore(
  withState(initialState),

  withComputed(({ status, results }) => ({
    isLoading: computed(() => status() === 'loading'),
    isError: computed(() => status() === 'error'),
    isEmpty: computed(() => status() === 'success' && results().length === 0),
  })),

  withMethods((store, api = inject(AvailabilityApi)) => ({
    // switchMap, never mergeMap: a late response from an abandoned search (someone adjusting
    // dates rapidly) must not overwrite a newer one -- the single highest-value store test here.
    search: rxMethod<GetAvailabilityParams>(
      pipe(
        tap(() => patchState(store, { status: 'loading', error: null })),
        switchMap((params) =>
          api.getAvailability(params).pipe(
            tapResponse({
              next: (response) =>
                patchState(store, {
                  results: response.data,
                  pagination: response.pagination,
                  status: 'success',
                }),
              error: (error: ApiError) => patchState(store, { status: 'error', error }),
            }),
          ),
        ),
      ),
    ),
  })),
);
