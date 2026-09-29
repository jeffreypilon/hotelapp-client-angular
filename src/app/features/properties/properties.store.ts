import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { inject } from '@angular/core';
import { PropertiesApi, type ListPropertiesParams } from '../../core/api/properties.api';
import { ApiError } from '../../core/api/api-error';
import type { Pagination, PropertySummary } from '../../core/api/types';

interface PropertiesState {
  results: PropertySummary[];
  pagination: Pagination | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error: ApiError | null;
}

const initialState: PropertiesState = {
  results: [],
  pagination: null,
  status: 'idle',
  error: null,
};

/**
 * Backs S1/S2, per state-management.md's `PropertiesStore` entry. Route-provided, so its state
 * is discarded on feature unload -- re-entry naturally refetches.
 */
export const PropertiesStore = signalStore(
  withState(initialState),

  withComputed(({ status, results }) => ({
    isLoading: computed(() => status() === 'loading'),
    isError: computed(() => status() === 'error'),
    isEmpty: computed(() => status() === 'success' && results().length === 0),
  })),

  withMethods((store, api = inject(PropertiesApi)) => ({
    // switchMap: a late response from an abandoned request must never overwrite a newer one.
    load: rxMethod<ListPropertiesParams>(
      pipe(
        tap(() => patchState(store, { status: 'loading', error: null })),
        switchMap((params) =>
          api.listProperties(params).pipe(
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
