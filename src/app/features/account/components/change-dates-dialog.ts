import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MyReservationsStore } from '../my-reservations.store';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import { ApiError } from '../../../core/api/api-error';
import { resolveError } from '../../../shared/util/errors/messages';
import { validateDateRange, type DateValidationErrors } from '../../../shared/util/date-validation';
import { totalAmountChangeMessage } from '../../../shared/util/reservation-change-summary';
import { formatMoney } from '../../../shared/util/format';
import type { Reservation } from '../../../core/api/types';

// Not fixed by the database or the contract -- a stated, implementer-chosen ceiling per
// ui-specifications.md's input-validation conventions, same value used on S2/S3/S6.
const MAX_GUESTS = 20;

/**
 * S8c's change-dates form, per ui-specifications.md -- native <dialog>, same rationale as
 * CancelDialog. Re-prices at current rates server-side; the confirmation states the new total
 * and, only when it differs from what was on screen, says so. Mounted by the parent only while
 * open, so each open is a fresh mount seeded from the current reservation -- no reset effect needed.
 */
@Component({
  selector: 'app-change-dates-dialog',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './change-dates-dialog.html',
})
export class ChangeDatesDialog implements OnInit {
  readonly reservation = input.required<Reservation>();
  readonly dismissed = output<void>();
  readonly changed = output<Reservation>();

  protected readonly store = inject(MyReservationsStore);
  protected readonly referenceData = inject(ReferenceDataStore);
  protected readonly maxGuests = MAX_GUESTS;

  protected readonly checkInDate = signal('');
  protected readonly checkOutDate = signal('');
  protected readonly numGuests = signal(1);
  protected readonly rateCategory = signal('NONE');
  protected readonly dateErrors = signal<DateValidationErrors>({});
  protected readonly formError = signal<string | null>(null);
  protected readonly isPending = signal(false);
  protected readonly outcome = signal<Reservation | null>(null);

  // Snapshotted once at mount, not read live from `reservation()` at comparison time --
  // `reservation` mirrors MyReservationsStore's own `reservation` signal, which
  // `store.patchReservation` already overwrites with the *new* pricing by the time this dialog's
  // own promise resolves. Comparing against the live input at that point would compare the new
  // total to itself and silently drop the "(was $X)" clause every time the total actually changed.
  private originalTotalAmount = '';

  private readonly dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialogEl().nativeElement.showModal());
  }

  // Required inputs aren't readable during construction (NG8118) -- seed the mutable form state
  // from the current reservation here instead, once Angular has applied the binding.
  ngOnInit(): void {
    const current = this.reservation();
    this.checkInDate.set(current.checkInDate);
    this.checkOutDate.set(current.checkOutDate);
    this.numGuests.set(current.numGuests);
    this.rateCategory.set(current.rateCategory);
    this.originalTotalAmount = current.pricing.totalAmount;
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl().nativeElement && !this.isPending()) this.close();
  }

  protected onBackdropKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !this.isPending()) this.close();
  }

  protected close(): void {
    this.dialogEl().nativeElement.close();
  }

  protected onClose(): void {
    this.dismissed.emit();
  }

  protected changeMessage(): string | null {
    const updated = this.outcome();
    if (!updated) return null;
    return totalAmountChangeMessage(
      this.originalTotalAmount,
      updated.pricing.totalAmount,
      updated.pricing.currency,
    );
  }

  /** Fallback confirmation text when the re-priced total is unchanged, so `changeMessage` is `null`. */
  protected confirmationMessage(): string {
    const updated = this.outcome();
    if (!updated) return '';
    return (
      this.changeMessage() ??
      `Your total is ${formatMoney(updated.pricing.totalAmount, updated.pricing.currency)}.`
    );
  }

  protected async submit(): Promise<void> {
    const errors = validateDateRange(this.checkInDate(), this.checkOutDate());
    this.dateErrors.set(errors);
    if (Object.keys(errors).length > 0) return;
    if (this.numGuests() < 1) return;

    this.formError.set(null);
    this.isPending.set(true);
    try {
      const updated = await this.store.patchReservation(this.reservation().id, {
        checkInDate: this.checkInDate(),
        checkOutDate: this.checkOutDate(),
        numGuests: this.numGuests(),
        rateCategory: this.rateCategory(),
      });
      this.outcome.set(updated);
      this.changed.emit(updated);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_STATUS_TRANSITION') {
        this.close();
        return;
      }
      this.formError.set(resolveError(err).message);
    } finally {
      this.isPending.set(false);
    }
  }
}
