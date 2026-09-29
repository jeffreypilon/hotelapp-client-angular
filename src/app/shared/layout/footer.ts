import { ChangeDetectionStrategy, Component } from '@angular/core';

/** S0 footer: minimal, per ui-specifications.md. */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="border-t border-slate-200 bg-white">
      <div class="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-500">
        <p>&copy; {{ year }} HotelApp</p>
        <p>Demo application — no real bookings</p>
      </div>
    </footer>
  `,
})
export class Footer {
  protected readonly year = new Date().getFullYear();
}
