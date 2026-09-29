import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The one shared layout for /login and /register, per ui-specifications.md S5. */
@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto max-w-sm px-4 py-16">
      <h1 class="text-2xl font-semibold text-slate-900">{{ title() }}</h1>
      <div class="mt-6"><ng-content /></div>
      <p class="mt-6 text-sm text-slate-600"><ng-content select="[footer]" /></p>
    </main>
  `,
})
export class AuthLayout {
  readonly title = input.required<string>();
}
