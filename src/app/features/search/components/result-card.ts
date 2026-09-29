import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SafeImageUrl } from '../../../shared/util/safe-image-url';
import { getInitials } from '../../../shared/util/initials';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { occupancyLabel, rateUnit } from '../../../shared/util/room-type-categories';
import type { AvailabilityResult } from '../../../core/api/types';

/** availableRoomCount === 1 -> "Only 1 room left"; 2-3 -> "Only N rooms left"; above 3 -> nothing. */
function scarcityText(count: number): string | null {
  if (count === 1) return 'Only 1 room left';
  if (count >= 2 && count <= 3) return `Only ${count} rooms left`;
  return null;
}

/** S3's result card, per ui-specifications.md -- matches the React client's ResultCard.tsx layout exactly. */
@Component({
  selector: 'app-result-card',
  imports: [RouterLink, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './result-card.html',
})
export class ResultCard {
  readonly result = input.required<AvailabilityResult>();
  readonly propertyId = input.required<string>();
  readonly checkInDate = input.required<string>();
  readonly checkOutDate = input.required<string>();
  readonly numGuests = input.required<number>();
  readonly rateCategory = input.required<string>();
  /** Label lookup from GET /rate-categories -- labels come from the API, never hardcoded. */
  readonly rateCategoryLabels = input.required<Record<string, string>>();

  protected readonly safeImageUrl = inject(SafeImageUrl);
  protected readonly getInitials = getInitials;
  protected readonly occupancyLabel = occupancyLabel;
  protected readonly rateUnit = rateUnit;
  protected readonly scarcityText = scarcityText;

  protected hasDiscount(): boolean {
    return this.result().pricing.discountPercent !== '0.00';
  }

  protected bookQueryParams(): Record<string, string> {
    return {
      roomTypeId: this.result().roomType.id,
      checkInDate: this.checkInDate(),
      checkOutDate: this.checkOutDate(),
      numGuests: String(this.numGuests()),
      rateCategory: this.rateCategory(),
    };
  }
}
