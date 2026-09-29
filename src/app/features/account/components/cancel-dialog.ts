import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MyReservationsStore } from '../my-reservations.store';
import { ApiError } from '../../../core/api/api-error';
import { resolveError } from '../../../shared/util/errors/messages';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import type { CancelReservationResponse } from '../../../core/api/types';

/**
 * S8c's cancel confirmation, per ui-specifications.md -- native <dialog> for built-in modal
 * semantics (focus trap, Esc-to-dismiss, and focus return to the invoking button on close), same
 * pattern as RoomTypeDialog (Step 2) and the React client's equivalent. Mounted by the parent only
 * while open (`@if`), so each open is a fresh mount -- no reset-on-open effect needed.
 */
@Component({
  selector: 'app-cancel-dialog',
  imports: [MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cancel-dialog.html',
})
export class CancelDialog {
  readonly reservationId = input.required<string>();
  readonly totalAmount = input.required<string>();
  readonly currency = input.required<string>();
  readonly isRefundableNow = input.required<boolean>();
  readonly dismissed = output<void>();
  readonly cancelled = output<CancelReservationResponse>();

  protected readonly store = inject(MyReservationsStore);
  protected readonly isPending = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly outcome = signal<CancelReservationResponse | null>(null);

  private readonly dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialogEl().nativeElement.showModal());
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl().nativeElement && !this.isPending()) this.close();
  }

  // Native <dialog> already closes on Escape; this keeps @angular-eslint/template's
  // click-events-have-key-events rule satisfied for the backdrop click above.
  protected onBackdropKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !this.isPending()) this.close();
  }

  protected close(): void {
    this.dialogEl().nativeElement.close();
  }

  protected onClose(): void {
    this.dismissed.emit();
  }

  protected async confirm(): Promise<void> {
    this.formError.set(null);
    this.isPending.set(true);
    try {
      const outcome = await this.store.cancelReservation(this.reservationId());
      this.outcome.set(outcome);
      this.cancelled.emit(outcome);
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
