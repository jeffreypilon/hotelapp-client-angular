import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { SafeImageUrl } from '../../../shared/util/safe-image-url';
import { getInitials } from '../../../shared/util/initials';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  occupancyLabel,
  rateUnit,
  roomTypeCategoryLabel,
} from '../../../shared/util/room-type-categories';
import type { RoomType } from '../../../core/api/types';

/** S2's "Rooms" section card -- a horizontal card, stacking on mobile. */
@Component({
  selector: 'app-room-type-card',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './room-type-card.html',
})
export class RoomTypeCard {
  readonly roomType = input.required<RoomType>();
  readonly selectRoomType = output<void>();
  readonly checkAvailability = output<void>();

  protected readonly safeImageUrl = inject(SafeImageUrl);
  protected readonly getInitials = getInitials;
  protected readonly roomTypeCategoryLabel = roomTypeCategoryLabel;
  protected readonly occupancyLabel = occupancyLabel;
  protected readonly rateUnit = rateUnit;

  protected primaryPhotoUrl(roomType: RoomType): string | null {
    const primary = roomType.photos.find((photo) => photo.isPrimary) ?? roomType.photos[0];
    return this.safeImageUrl.resolve(primary?.url ?? null);
  }
}
