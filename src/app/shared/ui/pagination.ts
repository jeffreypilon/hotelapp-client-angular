import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Presentational only -- inputs in, markup out, per architecture-specification.md. */
@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav aria-label="Pagination" class="mt-8 flex items-center justify-center gap-4">
        <button
          type="button"
          (click)="pageChange.emit(page() - 1)"
          [disabled]="!hasPreviousPage()"
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-40"
        >
          Previous
        </button>
        <span class="text-sm text-slate-600">Page {{ page() }} of {{ totalPages() }}</span>
        <button
          type="button"
          (click)="pageChange.emit(page() + 1)"
          [disabled]="!hasNextPage()"
          class="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    }
  `,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly hasPreviousPage = input.required<boolean>();
  readonly hasNextPage = input.required<boolean>();
  readonly pageChange = output<number>();
}
