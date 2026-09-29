import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** S15 -- unmatched route. A 404 from a resource fetch renders in-place instead; this is routing-level only. */
@Component({
  selector: 'app-not-found-screen',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto max-w-md px-4 py-24 text-center">
      <h1 class="text-2xl font-semibold text-slate-900">We couldn't find that page.</h1>
      <a routerLink="/" class="mt-4 inline-block font-medium text-slate-900 underline">
        Back to our hotels
      </a>
    </main>
  `,
})
export class NotFoundScreen {}
