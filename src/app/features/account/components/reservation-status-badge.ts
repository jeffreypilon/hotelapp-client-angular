import { ChangeDetectionStrategy, Component, input } from '@angular/core';

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmed',
  CHECKED_IN: 'Checked in',
  CHECKED_OUT: 'Checked out',
  CANCELLED: 'Cancelled',
};

// Per ui-specifications.md's S8b table: Confirmed neutral-positive, Checked in active,
// Checked out muted, Cancelled muted (its strikethrough applies to the dates, not this badge).
const STATUS_CLASSES: Record<string, string> = {
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  CHECKED_IN: 'bg-blue-100 text-blue-800',
  CHECKED_OUT: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

/** Presentational only, per architecture-specification.md. */
@Component({
  selector: 'app-reservation-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium {{ className() }}">
      {{ label() }}
    </span>
  `,
})
export class ReservationStatusBadge {
  readonly status = input.required<string>();

  protected readonly label = () => STATUS_LABELS[this.status()] ?? this.status();
  protected readonly className = () =>
    STATUS_CLASSES[this.status()] ?? 'bg-slate-100 text-slate-600';
}
