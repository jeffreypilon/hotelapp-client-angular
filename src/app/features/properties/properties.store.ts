import { computed } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { inject } from '@angular/core';
import { PropertiesApi, type ListPropertiesParams } from '../../core/api/properties.api';
import { RoomTypesApi } from '../../core/api/room-types.api';
import { ApiError } from '../../core/api/api-error';
import type { Pagination, PropertyDetail, PropertySummary, RoomType } from '../../core/api/types';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

interface PropertiesState {
  results: PropertySummary[];
  pagination: Pagination | null;
  status: LoadStatus;
  error: ApiError | null;

  // S2 -- property detail
  detail: PropertyDetail | null;
  detailStatus: LoadStatus;
  detailError: ApiError | null;

  // S2 -- the "Rooms" section
  roomTypes: RoomType[];
  roomTypesStatus: LoadStatus;
  roomTypesError: ApiError | null;

  // S2 -- room-type detail (modal or standalone route)
  roomType: RoomType | null;
  roomTypeStatus: LoadStatus;
  roomTypeError: ApiError | null;
}

const initialState: PropertiesState = {
  results: [],
  pagination: null,
  status: 'idle',
  error: null,

  detail: null,
  detailStatus: 'idle',
  detailError: null,

  roomTypes: [],
  roomTypesStatus: 'idle',
  roomTypesError: null,

  roomType: null,
  roomTypeStatus: 'idle',
  roomTypeError: null,
};

/**
 * Backs S1/S2, per state-management.md's `PropertiesStore` entry. Route-provided, so its state
 * is discarded on feature unload -- re-entry naturally refetches, which is this stack's stand-in
 * for TanStack Query's cache-per-query-key behavior on the React client.
 */
export const PropertiesStore = signalStore(
  withState(initialState),

  withComputed(({ status, results, detailStatus, roomTypes, roomTypesStatus, roomTypeStatus }) => ({
    isLoading: computed(() => status() === 'loading'),
    isError: computed(() => status() === 'error'),
    isEmpty: computed(() => status() === 'success' && results().length === 0),

    isDetailLoading: computed(() => detailStatus() === 'loading'),
    isDetailError: computed(() => detailStatus() === 'error'),

    isRoomTypesLoading: computed(() => roomTypesStatus() === 'loading'),
    isRoomTypesError: computed(() => roomTypesStatus() === 'error'),
    isRoomTypesEmpty: computed(() => roomTypesStatus() === 'success' && roomTypes().length === 0),

    isRoomTypeLoading: computed(() => roomTypeStatus() === 'loading'),
    isRoomTypeError: computed(() => roomTypeStatus() === 'error'),
  })),

  withMethods((store, api = inject(PropertiesApi), roomTypesApi = inject(RoomTypesApi)) => ({
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

    loadProperty: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { detailStatus: 'loading', detailError: null })),
        switchMap((idOrSlug) =>
          api.getProperty(idOrSlug).pipe(
            tapResponse({
              next: (detail) => patchState(store, { detail, detailStatus: 'success' }),
              error: (error: ApiError) =>
                patchState(store, { detailStatus: 'error', detailError: error }),
            }),
          ),
        ),
      ),
    ),

    loadRoomTypes: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { roomTypesStatus: 'loading', roomTypesError: null })),
        switchMap((propertyId) =>
          roomTypesApi.getRoomTypes(propertyId).pipe(
            tapResponse({
              next: (roomTypes) => patchState(store, { roomTypes, roomTypesStatus: 'success' }),
              error: (error: ApiError) =>
                patchState(store, { roomTypesStatus: 'error', roomTypesError: error }),
            }),
          ),
        ),
      ),
    ),

    loadRoomType: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { roomTypeStatus: 'loading', roomTypeError: null })),
        switchMap((roomTypeId) =>
          roomTypesApi.getRoomType(roomTypeId).pipe(
            tapResponse({
              next: (roomType) => patchState(store, { roomType, roomTypeStatus: 'success' }),
              error: (error: ApiError) =>
                patchState(store, { roomTypeStatus: 'error', roomTypeError: error }),
            }),
          ),
        ),
      ),
    ),

    clearRoomType(): void {
      patchState(store, { roomType: null, roomTypeStatus: 'idle', roomTypeError: null });
    },
  })),
);
