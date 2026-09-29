import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { formatDate, formatTimestamp } from '../../../shared/util/format';
import type { AvailabilityResult, PropertyDetail } from '../../../core/api/types';

/**
 * Shared by S4 ("full" variant) and S6 ("condensed" variant), per ui-specifications.md -- S6 wants
 * only "a condensed booking summary and the total". Matches the React client's
 * BookingSummaryCard.tsx layout exactly.
 */
@Component({
  selector: 'app-booking-summary-card',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking-summary-card.html',
})
export class BookingSummaryCard {
  readonly property = input.required<PropertyDetail>();
  readonly result = input.required<AvailabilityResult>();
  readonly checkInDate = input.required<string>();
  readonly checkOutDate = input.required<string>();
  readonly numGuests = input.required<number>();
  readonly rateCategoryLabel = input<string | null>(null);
  /** ISO instant, in the property's timezone -- computed by the caller via cancellation-deadline.ts. */
  readonly cancellationDeadline = input.required<string>();
  readonly timezone = input.required<string>();
  readonly variant = input.required<'full' | 'condensed'>();

  protected readonly formatDate = formatDate;
  protected readonly formatTimestamp = formatTimestamp;
}
