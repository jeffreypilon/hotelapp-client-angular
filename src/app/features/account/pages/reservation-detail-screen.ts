import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MyReservationsStore } from '../my-reservations.store';
import { ReservationStatusBadge } from '../components/reservation-status-badge';
import { CancelDialog } from '../components/cancel-dialog';
import { ChangeDatesDialog } from '../components/change-dates-dialog';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import { resolveError } from '../../../shared/util/errors/messages';
import { formatDate, formatMoney, formatTimestamp } from '../../../shared/util/format';
import { rateCategoryLabel } from '../../../shared/util/rate-category';
import type { CancelReservationResponse } from '../../../core/api/types';

/**
 * S8c -- reservation detail, per ui-specifications.md. Action area is entirely governed by
 * `status` and the server-computed `cancellation.isRefundableNow` -- never recomputed client-side,
 * matching the React client's own ReservationDetailScreen.
 */
@Component({
  selector: 'app-reservation-detail-screen',
  imports: [RouterLink, ReservationStatusBadge, CancelDialog, ChangeDatesDialog],
  providers: [MyReservationsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reservation-detail-screen.html',
})
export class ReservationDetailScreen {
  readonly reservationId = input<string>();

  protected readonly store = inject(MyReservationsStore);
  protected readonly referenceData = inject(ReferenceDataStore);
  protected readonly resolveError = resolveError;
  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly formatTimestamp = formatTimestamp;
  protected readonly rateCategoryLabel = rateCategoryLabel;

  protected readonly cancelDialogOpen = signal(false);
  protected readonly changeDialogOpen = signal(false);
  protected readonly cancelOutcome = signal<CancelReservationResponse | null>(null);

  constructor() {
    this.referenceData.loadOnce();
    effect(() => {
      const id = this.reservationId();
      if (id) this.store.loadReservation(id);
    });
  }

  protected openCancelDialog(): void {
    this.cancelDialogOpen.set(true);
  }

  protected closeCancelDialog(): void {
    this.cancelDialogOpen.set(false);
  }

  protected onCancelled(outcome: CancelReservationResponse): void {
    this.cancelOutcome.set(outcome);
  }

  protected openChangeDialog(): void {
    this.changeDialogOpen.set(true);
  }

  protected closeChangeDialog(): void {
    this.changeDialogOpen.set(false);
  }

  protected onChanged(): void {
    // No further action needed -- the store's own `reservation` signal already holds the update.
  }
}
