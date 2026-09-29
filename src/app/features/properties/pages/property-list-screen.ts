import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PropertiesStore } from '../properties.store';
import { Pagination } from '../../../shared/ui/pagination';
import { SafeImageUrl } from '../../../shared/util/safe-image-url';
import { getInitials } from '../../../shared/util/initials';
import type { PropertySummary } from '../../../core/api/types';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

/**
 * S1 -- property list, per ui-specifications.md. Search, city filter, sort, and page all live in
 * the URL's query params, not component state, so the view survives a reload and is shareable.
 */
@Component({
  selector: 'app-property-list-screen',
  imports: [RouterLink, FormsModule, Pagination],
  providers: [PropertiesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './property-list-screen.html',
})
export class PropertyListScreen {
  protected readonly store = inject(PropertiesStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly safeImageUrl = inject(SafeImageUrl);
  protected readonly getInitials = getInitials;

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly q = () => this.queryParamMap().get('q') ?? '';
  protected readonly city = () => this.queryParamMap().get('city') ?? '';
  protected readonly sort = () =>
    this.queryParamMap().get('sort') === 'city:asc' ? 'city:asc' : 'name:asc';
  // Number.isFinite, not `|| 1` -- page=0 or page=-1 is invalid input that must reach the server
  // as-is and come back a 400, per api-contracts.md's "never silently clamped" rule.
  protected readonly page = () => {
    const parsed = Number(this.queryParamMap().get('page') ?? '1');
    return Number.isFinite(parsed) ? parsed : 1;
  };
  protected readonly isFiltered = () => this.q().length > 0 || this.city().length > 0;

  protected readonly qInput = signal(this.q());
  protected readonly cityInput = signal(this.city());

  constructor() {
    // Debounce free-text filters before writing to the URL, per state-management.md, so typing
    // doesn't produce a navigation per keystroke. Compares against the *current* URL params
    // rather than a stale value, so it never strips an existing `page` from a deep link.
    effect((onCleanup) => {
      const qValue = this.qInput();
      const cityValue = this.cityInput();
      const timeout = setTimeout(() => {
        const currentQ = this.q();
        const currentCity = this.city();
        if (currentQ === qValue && currentCity === cityValue) return;
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { q: qValue || null, city: cityValue || null, page: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }, DEBOUNCE_MS);
      onCleanup(() => clearTimeout(timeout));
    });

    effect(() => {
      this.store.load({
        page: this.page(),
        pageSize: PAGE_SIZE,
        sort: this.sort(),
        city: this.city() || undefined,
        q: this.q() || undefined,
      });
    });
  }

  protected clearFilters(): void {
    this.qInput.set('');
    this.cityInput.set('');
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null, city: null, page: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected onSortChange(sort: string): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sort, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected onPageChange(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  protected roomTypeCountLabel(property: PropertySummary): string {
    return `${property.roomTypeCount} room ${property.roomTypeCount === 1 ? 'type' : 'types'}`;
  }
}
