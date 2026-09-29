import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';
import { RoomTypeDetailContent } from './room-type-detail-content';
import type { ApiError } from '../../../core/api/api-error';
import type { RoomType } from '../../../core/api/types';

/**
 * The desktop/mobile-agnostic "modal" for a room type, mounted only while open (see
 * property-detail-screen.ts) so state resets for free on each fresh mount -- same pattern noted
 * for the React client's native-<dialog> modals. showModal() runs once, in a mount-only effect.
 */
@Component({
  selector: 'app-room-type-dialog',
  imports: [RoomTypeDetailContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './room-type-dialog.html',
})
export class RoomTypeDialog {
  readonly roomType = input<RoomType | null>(null);
  readonly isLoading = input(false);
  readonly error = input<ApiError | null>(null);
  readonly closed = output<void>();

  private readonly dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => this.dialogEl().nativeElement.showModal());
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialogEl().nativeElement) this.dialogEl().nativeElement.close();
  }

  // Native <dialog> already closes on Escape; this keeps @angular-eslint/template's
  // click-events-have-key-events rule satisfied for the backdrop click above without changing
  // behavior (redundant with the browser's own Escape handling, harmless if it fires twice).
  protected onBackdropKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.dialogEl().nativeElement.close();
  }

  protected onClose(): void {
    this.closed.emit();
  }
}
