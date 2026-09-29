import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AvailabilityStore } from '../availability.store';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import { ResultCard } from '../components/result-card';
import { Pagination } from '../../../shared/ui/pagination';
import { validateDateRange } from '../../../shared/util/date-validation';
import {
  ROOM_TYPE_CATEGORY_LABELS,
  roomTypeCategoryLabel,
} from '../../../shared/util/room-type-categories';

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;
const ROOM_TYPE_CODES = Object.keys(ROOM_TYPE_CATEGORY_LABELS);
// Not fixed by the database or the contract -- stated, implementer-chosen ceilings per
// ui-specifications.md's input-validation conventions, matching the React client's Step 3 choice.
const MAX_GUESTS = 20;
const MAX_NIGHTLY_RATE = 100000;

const SORT_OPTIONS = [
  { value: 'nightlyRate:asc', label: 'Nightly rate: low to high' },
  { value: 'nightlyRate:desc', label: 'Nightly rate: high to low' },
  { value: 'maxOccupancy:asc', label: 'Max occupancy' },
  { value: 'name:asc', label: 'Name' },
];

/**
 * S3 -- search and results, per ui-specifications.md. All search parameters live in the URL via
 * query params, so a result set is shareable and survives reload -- same pattern as S1/S2.
 * `/properties/:propertyId/book` doesn't exist until a later step -- "Select room" 404s to S15
 * for now, same deferred-target pattern as every prior step.
 */
@Component({
  selector: 'app-search-screen',
  imports: [FormsModule, RouterLink, ResultCard, Pagination],
  providers: [AvailabilityStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search-screen.html',
})
export class SearchScreen {
  readonly propertyId = input<string>();

  protected readonly store = inject(AvailabilityStore);
  protected readonly referenceData = inject(ReferenceDataStore);
  protected readonly roomTypeCodes = ROOM_TYPE_CODES;
  protected readonly roomTypeCategoryLabel = roomTypeCategoryLabel;
  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly maxGuests = MAX_GUESTS;
  protected readonly maxNightlyRateLimit = MAX_NIGHTLY_RATE;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly checkInDate = () => this.queryParamMap().get('checkInDate') ?? '';
  protected readonly checkOutDate = () => this.queryParamMap().get('checkOutDate') ?? '';
  protected readonly numGuests = () => {
    const parsed = Number(this.queryParamMap().get('numGuests') ?? '1');
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  };
  protected readonly rateCategory = () => this.queryParamMap().get('rateCategory') ?? 'NONE';
  protected readonly roomTypeCode = () => this.queryParamMap().getAll('roomTypeCode');
  protected readonly amenityCode = () => this.queryParamMap().getAll('amenityCode');
  protected readonly accessibleOnly = () => this.queryParamMap().get('accessibleOnly') === 'true';
  protected readonly minNightlyRate = () => this.queryParamMap().get('minNightlyRate') ?? '';
  protected readonly maxNightlyRate = () => this.queryParamMap().get('maxNightlyRate') ?? '';
  protected readonly sort = () => {
    const value = this.queryParamMap().get('sort');
    return SORT_OPTIONS.some((o) => o.value === value) ? (value as string) : 'nightlyRate:asc';
  };
  protected readonly page = () => {
    const parsed = Number(this.queryParamMap().get('page') ?? '1');
    return Number.isFinite(parsed) ? parsed : 1;
  };

  protected readonly datesPresent = () => this.checkInDate() !== '' && this.checkOutDate() !== '';
  protected readonly dateErrors = () =>
    this.datesPresent() ? validateDateRange(this.checkInDate(), this.checkOutDate()) : {};
  protected readonly canSearch = () =>
    this.datesPresent() && Object.keys(this.dateErrors()).length === 0;

  // A missing property leaves nothing else on this screen to show -- page-level, per
  // property-detail-screen's own NOT_FOUND treatment (matches the React client's SearchScreen).
  protected readonly isNotFound = () =>
    this.store.isError() && this.store.error()?.code === 'NOT_FOUND';

  protected readonly minInput = signal(this.minNightlyRate());
  protected readonly maxInput = signal(this.maxNightlyRate());

  protected readonly rateCategoryLabels = () => {
    const labels: Record<string, string> = {};
    for (const option of this.referenceData.rateCategories()) labels[option.value] = option.label;
    return labels;
  };

  constructor() {
    this.referenceData.loadOnce();

    // Debounce the nightly-rate min/max text inputs before writing to the URL, same pattern as
    // S1's free-text filters -- diffed against the *current* URL, not a stale closure, so an
    // unrelated param (e.g. roomTypeCode carried over from the S2 handoff) is never dropped.
    effect((onCleanup) => {
      const minValue = this.minInput();
      const maxValue = this.maxInput();
      const timeout = setTimeout(() => {
        const currentMin = this.minNightlyRate();
        const currentMax = this.maxNightlyRate();
        if (currentMin === minValue && currentMax === maxValue) return;
        // Clamped once debounced, not on every keystroke -- clamping live would fight the guest
        // mid-type (e.g. typing "100" briefly passes through "1", "10").
        const clampedMin = minValue
          ? String(Math.min(MAX_NIGHTLY_RATE, Math.max(0, Number(minValue) || 0)))
          : null;
        const clampedMax = maxValue
          ? String(Math.min(MAX_NIGHTLY_RATE, Math.max(0, Number(maxValue) || 0)))
          : null;
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { minNightlyRate: clampedMin, maxNightlyRate: clampedMax, page: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }, DEBOUNCE_MS);
      onCleanup(() => clearTimeout(timeout));
    });

    effect(() => {
      const id = this.propertyId();
      if (!id || !this.canSearch()) return;
      this.store.search({
        propertyId: id,
        checkInDate: this.checkInDate(),
        checkOutDate: this.checkOutDate(),
        numGuests: this.numGuests(),
        roomTypeCode: this.roomTypeCode().length > 0 ? this.roomTypeCode() : undefined,
        rateCategory: this.rateCategory() !== 'NONE' ? this.rateCategory() : undefined,
        accessibleOnly: this.accessibleOnly() || undefined,
        amenityCode: this.amenityCode().length > 0 ? this.amenityCode() : undefined,
        minNightlyRate: this.minNightlyRate() || undefined,
        maxNightlyRate: this.maxNightlyRate() || undefined,
        sort: this.sort(),
        page: this.page(),
        pageSize: PAGE_SIZE,
      });
    });
  }

  private updateParams(
    params: Record<string, string | number | string[] | null>,
    resetPage = true,
  ): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: resetPage ? { ...params, page: null } : params,
      queryParamsHandling: 'merge',
    });
  }

  protected setDate(field: 'checkInDate' | 'checkOutDate', value: string): void {
    this.updateParams({ [field]: value || null });
  }

  protected onNumGuestsChange(value: number): void {
    this.updateParams({ numGuests: Math.min(MAX_GUESTS, Math.max(1, Number(value) || 1)) });
  }

  protected setRateCategory(value: string): void {
    this.updateParams({ rateCategory: value === 'NONE' ? null : value });
  }

  protected toggleRepeatable(key: 'roomTypeCode' | 'amenityCode', value: string): void {
    const current = key === 'roomTypeCode' ? this.roomTypeCode() : this.amenityCode();
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    this.updateParams({ [key]: updated.length > 0 ? updated : null });
  }

  protected setAccessibleOnly(value: boolean): void {
    this.updateParams({ accessibleOnly: value ? 'true' : null });
  }

  protected setSort(value: string): void {
    this.updateParams({ sort: value }, false);
  }

  protected setPage(nextPage: number): void {
    this.updateParams({ page: nextPage }, false);
  }

  protected tryDifferentDates(): void {
    this.updateParams({ checkInDate: null, checkOutDate: null });
  }

  protected clearFilters(): void {
    this.minInput.set('');
    this.maxInput.set('');
    this.updateParams({
      roomTypeCode: null,
      amenityCode: null,
      accessibleOnly: null,
      minNightlyRate: null,
      maxNightlyRate: null,
      rateCategory: null,
    });
  }
}
