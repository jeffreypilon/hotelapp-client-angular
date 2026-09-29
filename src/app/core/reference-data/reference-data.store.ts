import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { inject } from '@angular/core';
import { ReferenceApi } from '../api/reference.api';
import { ApiError } from '../api/api-error';
import type { AmenityReference, RateCategoryOption } from '../api/types';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

interface ReferenceDataState {
  amenities: AmenityReference[];
  amenitiesStatus: LoadStatus;
  amenitiesError: ApiError | null;

  rateCategories: RateCategoryOption[];
  rateCategoriesStatus: LoadStatus;
  rateCategoriesError: ApiError | null;
}

const initialState: ReferenceDataState = {
  amenities: [],
  amenitiesStatus: 'idle',
  amenitiesError: null,

  rateCategories: [],
  rateCategoriesStatus: 'idle',
  rateCategoriesError: null,
};

/**
 * Root-provided (a singleton, unlike PropertiesStore/AvailabilityStore), per state-management.md's
 * caching rule: amenities and rate categories are fixed reference data, fetched once per session --
 * `loadOnce` is a no-op after the first successful call, standing in for React's `staleTime: Infinity`.
 */
export const ReferenceDataStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ amenitiesStatus, rateCategoriesStatus }) => ({
    isAmenitiesLoading: computed(() => amenitiesStatus() === 'loading'),
    isRateCategoriesLoading: computed(() => rateCategoriesStatus() === 'loading'),
  })),

  withMethods((store, api = inject(ReferenceApi)) => {
    const loadAmenities = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { amenitiesStatus: 'loading', amenitiesError: null })),
        switchMap(() =>
          api.getAmenities().pipe(
            tapResponse({
              next: (amenities) => patchState(store, { amenities, amenitiesStatus: 'success' }),
              error: (error: ApiError) =>
                patchState(store, { amenitiesStatus: 'error', amenitiesError: error }),
            }),
          ),
        ),
      ),
    );

    const loadRateCategories = rxMethod<void>(
      pipe(
        tap(() =>
          patchState(store, { rateCategoriesStatus: 'loading', rateCategoriesError: null }),
        ),
        switchMap(() =>
          api.getRateCategories().pipe(
            tapResponse({
              next: (rateCategories) =>
                patchState(store, { rateCategories, rateCategoriesStatus: 'success' }),
              error: (error: ApiError) =>
                patchState(store, { rateCategoriesStatus: 'error', rateCategoriesError: error }),
            }),
          ),
        ),
      ),
    );

    return {
      /** Fetches once per session -- a repeat call while idle/loaded is a deliberate no-op. */
      loadOnce(): void {
        if (store.amenitiesStatus() === 'idle') loadAmenities();
        if (store.rateCategoriesStatus() === 'idle') loadRateCategories();
      },
    };
  }),
);
