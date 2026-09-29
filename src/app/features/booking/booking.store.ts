import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { PropertiesApi } from '../../core/api/properties.api';
import { AvailabilityApi } from '../../core/api/availability.api';
import { ReservationsApi } from '../../core/api/reservations.api';
import { ApiError } from '../../core/api/api-error';
import type { AvailabilityResult, PropertyDetail, Reservation } from '../../core/api/types';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface BookingContextParams {
  propertyId: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  numGuests: number;
  rateCategory: string;
}

interface BookingState {
  roomTypeId: string;

  property: PropertyDetail | null;
  propertyStatus: LoadStatus;
  propertyError: ApiError | null;

  availabilityResults: AvailabilityResult[];
  availabilityStatus: LoadStatus;
  availabilityError: ApiError | null;

  reservation: Reservation | null;
  reservationStatus: LoadStatus;
  reservationError: ApiError | null;
}

const initialState: BookingState = {
  roomTypeId: '',
  property: null,
  propertyStatus: 'idle',
  propertyError: null,
  availabilityResults: [],
  availabilityStatus: 'idle',
  availabilityError: null,
  reservation: null,
  reservationStatus: 'idle',
  reservationError: null,
};

/**
 * Backs S4, S6, and S7, per state-management.md's `BookingStore` entry -- route-provided, one
 * instance per screen. Booking context itself (room type, dates, guests, rate category) lives in
 * the URL query string, not here: a store is discarded on navigation away and back, which would
 * silently lose it exactly the way ui-specifications.md calls "the worst UX failure available in
 * this application" (the S5 login detour). `loadContext` re-derives pricing from the URL
 * parameters plus a fresh GET /availability call on every S4/S6 mount, matching the React client's
 * `useBookingContext` hook -- this also satisfies S4's "re-validation on arrival" requirement for
 * free, since it's the same live availability call.
 *
 * Card-shaped form state and the Idempotency-Key never pass through this store, per
 * security-implementation.md#payment-data -- S6 holds those in its own component state only.
 */
export const BookingStore = signalStore(
  withState(initialState),

  withComputed(
    ({
      roomTypeId,
      availabilityResults,
      availabilityStatus,
      propertyStatus,
      propertyError,
      availabilityError,
      reservationStatus,
      reservationError,
    }) => ({
      result: computed(() => availabilityResults().find((r) => r.roomType.id === roomTypeId())),
      // Only meaningful once the availability query has actually settled -- an empty match while
      // still loading is "don't know yet", not "no longer available".
      notAvailable: computed(
        () =>
          availabilityStatus() === 'success' &&
          !availabilityResults().find((r) => r.roomType.id === roomTypeId()),
      ),
      isContextPending: computed(
        () =>
          propertyStatus() === 'idle' ||
          propertyStatus() === 'loading' ||
          availabilityStatus() === 'idle' ||
          availabilityStatus() === 'loading',
      ),
      isContextError: computed(
        () => propertyStatus() === 'error' || availabilityStatus() === 'error',
      ),
      contextError: computed(() => propertyError() ?? availabilityError()),
      isReservationPending: computed(
        () => reservationStatus() === 'idle' || reservationStatus() === 'loading',
      ),
      isReservationError: computed(() => reservationStatus() === 'error'),
      reservationErrorValue: computed(() => reservationError()),
    }),
  ),

  withMethods(
    (
      store,
      propertiesApi = inject(PropertiesApi),
      availabilityApi = inject(AvailabilityApi),
      reservationsApi = inject(ReservationsApi),
    ) => {
      const loadProperty = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { propertyStatus: 'loading', propertyError: null })),
          switchMap((id) =>
            propertiesApi.getProperty(id).pipe(
              tapResponse({
                next: (property) => patchState(store, { property, propertyStatus: 'success' }),
                error: (error: ApiError) =>
                  patchState(store, { propertyStatus: 'error', propertyError: error }),
              }),
            ),
          ),
        ),
      );

      const searchAvailability = rxMethod<BookingContextParams>(
        pipe(
          tap(() => patchState(store, { availabilityStatus: 'loading', availabilityError: null })),
          switchMap((params) =>
            availabilityApi
              .getAvailability({
                propertyId: params.propertyId,
                checkInDate: params.checkInDate,
                checkOutDate: params.checkOutDate,
                numGuests: params.numGuests,
                rateCategory: params.rateCategory !== 'NONE' ? params.rateCategory : undefined,
              })
              .pipe(
                tapResponse({
                  next: (response) =>
                    patchState(store, {
                      availabilityResults: response.data,
                      availabilityStatus: 'success',
                    }),
                  error: (error: ApiError) =>
                    patchState(store, { availabilityStatus: 'error', availabilityError: error }),
                }),
              ),
          ),
        ),
      );

      const loadReservation = rxMethod<string>(
        pipe(
          tap(() => patchState(store, { reservationStatus: 'loading', reservationError: null })),
          switchMap((id) =>
            reservationsApi.getReservation(id).pipe(
              tapResponse({
                next: (reservation) =>
                  patchState(store, { reservation, reservationStatus: 'success' }),
                error: (error: ApiError) =>
                  patchState(store, { reservationStatus: 'error', reservationError: error }),
              }),
            ),
          ),
        ),
      );

      return {
        /** Called on S4/S6 mount, and again whenever the URL's booking params change. */
        loadContext(params: BookingContextParams): void {
          patchState(store, { roomTypeId: params.roomTypeId });
          loadProperty(params.propertyId);
          searchAvailability(params);
        },
        /** Called on S7 mount -- a real fetch, since S7 may be a direct load/share/reload. */
        loadReservation,
      };
    },
  ),
);
