import { computed, inject } from '@angular/core';
import { signalStore, withState, withComputed, withMethods, patchState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, switchMap, tap } from 'rxjs';
import { ReservationsApi, type ListReservationsParams } from '../../core/api/reservations.api';
import { ApiError } from '../../core/api/api-error';
import type {
  CancelReservationResponse,
  Pagination,
  PatchReservationRequest,
  Reservation,
  ReservationSummary,
} from '../../core/api/types';

type LoadStatus = 'idle' | 'loading' | 'success' | 'error';
type MutationStatus = 'idle' | 'pending' | 'success' | 'error';

interface MyReservationsState {
  list: ReservationSummary[];
  listPagination: Pagination | null;
  listStatus: LoadStatus;
  listError: ApiError | null;

  reservation: Reservation | null;
  reservationStatus: LoadStatus;
  reservationError: ApiError | null;

  mutationStatus: MutationStatus;
  mutationError: ApiError | null;
  cancelOutcome: CancelReservationResponse | null;
}

const initialState: MyReservationsState = {
  list: [],
  listPagination: null,
  listStatus: 'idle',
  listError: null,

  reservation: null,
  reservationStatus: 'idle',
  reservationError: null,

  mutationStatus: 'idle',
  mutationError: null,
  cancelOutcome: null,
};

/**
 * Backs S8b and S8c, per state-management.md's `MyReservationsStore` entry -- route-provided, one
 * instance per screen. Holds both the list (S8b) and a single detail (S8c) since the two screens
 * never mount simultaneously in this app's single-outlet routing. `PATCH`/cancel reload only the
 * detail here: because this store is route-provided, an unmounted S8b's list refetches fresh on
 * next entry anyway, per state-management.md's "a store for an unmounted feature does not exist to
 * reload" rule -- no cross-store signal is needed for this pair.
 */
export const MyReservationsStore = signalStore(
  withState(initialState),

  withComputed(({ listStatus, list, reservationStatus, mutationStatus }) => ({
    isListLoading: computed(() => listStatus() === 'loading'),
    isListError: computed(() => listStatus() === 'error'),
    isListEmpty: computed(() => listStatus() === 'success' && list().length === 0),
    isReservationPending: computed(
      () => reservationStatus() === 'idle' || reservationStatus() === 'loading',
    ),
    isReservationError: computed(() => reservationStatus() === 'error'),
    isMutating: computed(() => mutationStatus() === 'pending'),
  })),

  withMethods((store, api = inject(ReservationsApi)) => {
    const loadList = rxMethod<ListReservationsParams>(
      pipe(
        tap(() => patchState(store, { listStatus: 'loading', listError: null })),
        switchMap((params) =>
          api.listReservations(params).pipe(
            tapResponse({
              next: (response) =>
                patchState(store, {
                  list: response.data,
                  listPagination: response.pagination,
                  listStatus: 'success',
                }),
              error: (error: ApiError) =>
                patchState(store, { listStatus: 'error', listError: error }),
            }),
          ),
        ),
      ),
    );

    const loadReservation = rxMethod<string>(
      pipe(
        tap(() => patchState(store, { reservationStatus: 'loading', reservationError: null })),
        switchMap((id) =>
          api.getReservation(id).pipe(
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
      loadList,
      loadReservation,

      /** Resolves/rejects so the calling dialog can drive its own local outcome/error state. */
      cancelReservation(reservationId: string): Promise<CancelReservationResponse> {
        patchState(store, { mutationStatus: 'pending', mutationError: null });
        return new Promise((resolve, reject) => {
          api.cancelReservation(reservationId).subscribe({
            next: (outcome) => {
              patchState(store, { mutationStatus: 'success', cancelOutcome: outcome });
              loadReservation(reservationId);
              resolve(outcome);
            },
            error: (error: ApiError) => {
              patchState(store, { mutationStatus: 'error', mutationError: error });
              if (error.code !== 'INVALID_STATUS_TRANSITION') {
                reject(error);
                return;
              }
              // The client's view of state is stale -- refetch rather than leave a dead dialog
              // showing actions that no longer apply, per error-handling.md's 409 handling.
              loadReservation(reservationId);
              reject(error);
            },
          });
        });
      },

      patchReservation(reservationId: string, body: PatchReservationRequest): Promise<Reservation> {
        patchState(store, { mutationStatus: 'pending', mutationError: null });
        return new Promise((resolve, reject) => {
          api.patchReservation(reservationId, body).subscribe({
            next: (updated) => {
              patchState(store, { mutationStatus: 'success', reservation: updated });
              resolve(updated);
            },
            error: (error: ApiError) => {
              patchState(store, { mutationStatus: 'error', mutationError: error });
              if (error.code === 'INVALID_STATUS_TRANSITION') {
                loadReservation(reservationId);
              }
              reject(error);
            },
          });
        });
      },

      resetMutation(): void {
        patchState(store, { mutationStatus: 'idle', mutationError: null, cancelOutcome: null });
      },
    };
  }),
);
