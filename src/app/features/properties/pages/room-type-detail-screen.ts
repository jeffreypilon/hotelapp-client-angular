import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PropertiesStore } from '../properties.store';
import { RoomTypeDetailContent } from '../components/room-type-detail-content';

/**
 * Standalone route for /room-types/:roomTypeId -- a direct load renders this full page, per
 * ui-specifications.md's S2 entry. See property-detail-screen.ts for the in-app "modal" path,
 * which pushes the same URL without routing here (see that file's judgment-call comment).
 */
@Component({
  selector: 'app-room-type-detail-screen',
  imports: [RouterLink, RoomTypeDetailContent],
  providers: [PropertiesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './room-type-detail-screen.html',
})
export class RoomTypeDetailScreen {
  readonly roomTypeId = input<string>();
  protected readonly store = inject(PropertiesStore);

  constructor() {
    effect(() => {
      const id = this.roomTypeId();
      if (id) this.store.loadRoomType(id);
    });
  }
}
