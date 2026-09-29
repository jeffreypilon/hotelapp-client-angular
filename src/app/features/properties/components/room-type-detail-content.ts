import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { SafeImageUrl } from '../../../shared/util/safe-image-url';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import {
  occupancyLabel,
  rateUnit,
  roomTypeCategoryLabel,
} from '../../../shared/util/room-type-categories';
import type { RoomType } from '../../../core/api/types';

/**
 * Full room-type detail content -- shared by the desktop dialog (property-detail-screen) and the
 * standalone route (room-type-detail-screen), per ui-specifications.md's S2 entry: photo gallery,
 * full description, complete amenity list with names, bed configuration, max occupancy,
 * accessibility flag.
 */
@Component({
  selector: 'app-room-type-detail-content',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './room-type-detail-content.html',
})
export class RoomTypeDetailContent {
  readonly roomType = input.required<RoomType>();
  protected readonly safeImageUrl = inject(SafeImageUrl);
  protected readonly roomTypeCategoryLabel = roomTypeCategoryLabel;
  protected readonly occupancyLabel = occupancyLabel;
  protected readonly rateUnit = rateUnit;
}
