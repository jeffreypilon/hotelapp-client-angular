import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BookingStore } from '../booking.store';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import { resolveError } from '../../../shared/util/errors/messages';
import { formatDate, formatTimestamp } from '../../../shared/util/format';
import { rateCategoryLabel } from '../../../shared/util/rate-category';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import type { Reservation } from '../../../core/api/types';

/**
 * S7 -- confirmation, per ui-specifications.md. Arrives from S6 with the reservation carried via
 * Router navigation `state` (this stack has no TanStack-Query-style shared cache to pre-warm the
 * way the React client does) -- read once from `history.state` here rather than re-fetched, so
 * this doesn't need a redundant GET right after the POST that just returned the same data.
 * `history.state`, not `router.getCurrentNavigation()`, since the latter is only populated while a
 * navigation is in flight and is already `null` by the time this component constructs. A direct
 * load/share/reload has no navigation state, so it does a real fetch via BookingStore.
 */
@Component({
  selector: 'app-confirmation-screen',
  imports: [RouterLink, MoneyPipe],
  providers: [BookingStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmation-screen.html',
})
export class ConfirmationScreen {
  readonly reservationId = input<string>();

  protected readonly store = inject(BookingStore);
  protected readonly referenceData = inject(ReferenceDataStore);
  protected readonly resolveError = resolveError;
  protected readonly formatDate = formatDate;
  protected readonly formatTimestamp = formatTimestamp;
  protected readonly rateCategoryLabel = rateCategoryLabel;
  protected readonly copied = signal(false);

  private readonly navigationStateReservation = (history.state as Record<string, unknown> | null)?.[
    'reservation'
  ] as Reservation | undefined;

  protected readonly reservation = signal<Reservation | undefined>(undefined);
  protected readonly isPending = () => !this.reservation() && this.store.isReservationPending();
  protected readonly isError = () => !this.reservation() && this.store.isReservationError();

  constructor() {
    this.referenceData.loadOnce();
    effect(() => {
      const id = this.reservationId();
      if (!id) return;
      // Only trust the navigation-state reservation if it's actually for this id -- a same-tab
      // Back/Forward to a *different* reservation's confirmation URL must not reuse stale state
      // left over from a previous booking.
      if (this.navigationStateReservation?.id === id) {
        this.reservation.set(this.navigationStateReservation);
        return;
      }
      this.store.loadReservation(id);
    });
    effect(() => {
      if (this.reservation()) return;
      const loaded = this.store.reservation();
      if (loaded) this.reservation.set(loaded);
    });
  }

  protected async copyConfirmationNumber(): Promise<void> {
    const r = this.reservation();
    if (!r) return;
    await navigator.clipboard.writeText(r.confirmationNumber);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  protected print(): void {
    window.print();
  }
}
