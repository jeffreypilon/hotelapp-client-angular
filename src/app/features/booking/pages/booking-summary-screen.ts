import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingStore } from '../booking.store';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import { BookingSummaryCard } from '../components/booking-summary-card';
import { resolveError } from '../../../shared/util/errors/messages';
import { cancellationDeadline } from '../../../shared/util/cancellation-deadline';
import { rateCategoryLabel } from '../../../shared/util/rate-category';

/**
 * S4 -- booking summary, per ui-specifications.md. Requires an authenticated guest (authGuard in
 * app.routes.ts). Re-runs the availability query on mount via BookingStore.loadContext, which
 * doubles as the "re-validation on arrival" the spec calls for -- if the room type isn't in the
 * results, that's the "no longer available" case below, not an error.
 */
@Component({
  selector: 'app-booking-summary-screen',
  imports: [RouterLink, BookingSummaryCard],
  providers: [BookingStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-summary-screen.html',
})
export class BookingSummaryScreen {
  readonly propertyId = input<string>();

  protected readonly store = inject(BookingStore);
  protected readonly referenceData = inject(ReferenceDataStore);
  protected readonly resolveError = resolveError;
  protected readonly rateCategoryLabel = rateCategoryLabel;
  protected readonly cancellationDeadline = cancellationDeadline;

  private readonly route = inject(ActivatedRoute);
  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly roomTypeId = () => this.queryParamMap().get('roomTypeId') ?? '';
  protected readonly checkInDate = () => this.queryParamMap().get('checkInDate') ?? '';
  protected readonly checkOutDate = () => this.queryParamMap().get('checkOutDate') ?? '';
  protected readonly numGuests = () => {
    const parsed = Number(this.queryParamMap().get('numGuests') ?? '1');
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  };
  protected readonly rateCategory = () => this.queryParamMap().get('rateCategory') ?? 'NONE';

  /** Carried forward unchanged to the payment step and to a "back to search" link. */
  protected readonly searchQueryParams = (): Record<string, string> => {
    const map = this.queryParamMap();
    return Object.fromEntries(map.keys.map((key) => [key, map.get(key) ?? '']));
  };

  protected readonly rateCategoryLabelText = () =>
    this.rateCategory() !== 'NONE'
      ? this.rateCategoryLabel(this.referenceData.rateCategories(), this.rateCategory())
      : null;

  constructor() {
    this.referenceData.loadOnce();
    effect(() => {
      const id = this.propertyId();
      if (!id) return;
      this.store.loadContext({
        propertyId: id,
        roomTypeId: this.roomTypeId(),
        checkInDate: this.checkInDate(),
        checkOutDate: this.checkOutDate(),
        numGuests: this.numGuests(),
        rateCategory: this.rateCategory(),
      });
    });
  }
}
