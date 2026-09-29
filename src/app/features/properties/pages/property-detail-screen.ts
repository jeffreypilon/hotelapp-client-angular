import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PropertiesStore } from '../properties.store';
import { RoomTypeCard } from '../components/room-type-card';
import { RoomTypeDialog } from '../components/room-type-dialog';
import { SafeImageUrl } from '../../../shared/util/safe-image-url';
import { getInitials } from '../../../shared/util/initials';
import { formatPhoneNumber } from '../../../shared/util/phone';

// Not fixed by the database or the contract -- a stated ceiling per ui-specifications.md's
// input-validation conventions. 20 matches the largest room capacity seeded so far (the
// conference room), mirroring the React client's Step 2 choice.
const MAX_GUESTS = 20;

/**
 * S2 -- property detail, per ui-specifications.md.
 *
 * Judgment call -- the room-type "modal on desktop, full route on mobile, route-addressable
 * either way" requirement: React's implementation relies on React Router's declarative
 * background-location trick (rendering two <Routes> against two different locations at once),
 * which Angular's Router has no equivalent for. Instead, opening a room type here mounts
 * `RoomTypeDialog` locally (no route change) and pushes `/room-types/:id` onto the URL via
 * `Location.go()`, which updates the address bar and browser history WITHOUT notifying the
 * Router (pushState never fires `popstate`, and the Router only reacts to `popstate`/`hashchange`
 * via `Location.subscribe`) -- so this screen stays mounted underneath. A direct load of that URL
 * never runs this code path at all; it hits the Router's real route match and renders
 * `RoomTypeDetailScreen` as a full page instead. Closing the dialog calls `location.back()` to
 * pop that entry; a `Location.subscribe` also closes the dialog if the user presses the browser
 * Back button directly instead of this screen's own close control.
 */
@Component({
  selector: 'app-property-detail-screen',
  imports: [FormsModule, RouterLink, RoomTypeCard, RoomTypeDialog],
  providers: [PropertiesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './property-detail-screen.html',
})
export class PropertyDetailScreen {
  readonly propertyIdOrSlug = input<string>();

  protected readonly store = inject(PropertiesStore);
  protected readonly safeImageUrl = inject(SafeImageUrl);
  protected readonly getInitials = getInitials;
  protected readonly formatPhoneNumber = formatPhoneNumber;
  protected readonly maxGuests = MAX_GUESTS;

  private readonly router = inject(Router);
  private readonly location = inject(Location);

  protected readonly checkInDate = signal('');
  protected readonly checkOutDate = signal('');
  protected readonly numGuests = signal(1);

  protected readonly openRoomTypeId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.propertyIdOrSlug();
      if (id) {
        this.store.loadProperty(id);
        this.store.loadRoomTypes(id);
      }
    });

    const subscription = this.location.subscribe(() => {
      if (this.openRoomTypeId()) this.dismissRoomTypeDialog();
    });
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  protected checkAvailability(roomTypeCode?: string): void {
    const id = this.propertyIdOrSlug();
    if (!id) return;
    void this.router.navigate(['/properties', id, 'search'], {
      queryParams: {
        checkInDate: this.checkInDate() || null,
        checkOutDate: this.checkOutDate() || null,
        numGuests: this.numGuests(),
        roomTypeCode: roomTypeCode ?? null,
      },
    });
  }

  protected onNumGuestsChange(value: number): void {
    this.numGuests.set(Math.min(MAX_GUESTS, Math.max(1, Number(value) || 1)));
  }

  protected openRoomType(id: string): void {
    this.openRoomTypeId.set(id);
    this.store.loadRoomType(id);
    this.location.go(`/room-types/${id}`);
  }

  protected closeRoomTypeDialog(): void {
    this.location.back();
  }

  private dismissRoomTypeDialog(): void {
    this.openRoomTypeId.set(null);
    this.store.clearRoomType();
  }
}
