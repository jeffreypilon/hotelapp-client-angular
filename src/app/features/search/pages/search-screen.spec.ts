import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { signal } from '@angular/core';
import { SearchScreen } from './search-screen';
import { AvailabilityStore } from '../availability.store';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import { ApiError } from '../../../core/api/api-error';
import type { AvailabilityResult, Pagination } from '../../../core/api/types';

function result(overrides: Partial<AvailabilityResult> = {}): AvailabilityResult {
  return {
    roomType: {
      id: 'rt-1',
      code: 'KING',
      name: 'Deluxe King',
      maxOccupancy: 2,
      bedConfiguration: 'one king bed',
      isAccessible: false,
      amenities: [],
      primaryPhotoUrl: null,
    },
    pricing: {
      rateCategory: 'NONE',
      baseRate: '249.00',
      discountPercent: '0.00',
      nightlyRate: '249.00',
      nights: 2,
      totalAmount: '498.00',
      currency: 'USD',
    },
    availableRoomCount: 4,
    ...overrides,
  };
}

function pagination(overrides: Partial<Pagination> = {}): Pagination {
  return {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
    ...overrides,
  };
}

// Per testing-standards.md's component-tests section: a page component's rendering is tested
// against a stub store, not a real store and real HTTP.
function fakeAvailabilityStore(overrides: Record<string, unknown> = {}) {
  return {
    results: signal<AvailabilityResult[]>([]),
    pagination: signal<Pagination | null>(null),
    isLoading: signal(false),
    isError: signal(false),
    isEmpty: signal(false),
    error: signal<ApiError | null>(null),
    search: () => undefined,
    ...overrides,
  };
}

function fakeReferenceDataStore(overrides: Record<string, unknown> = {}) {
  return {
    amenities: signal([]),
    rateCategories: signal([]),
    isAmenitiesLoading: signal(false),
    isRateCategoriesLoading: signal(false),
    loadOnce: () => undefined,
    ...overrides,
  };
}

async function render(
  url: string,
  availabilityOverrides: Record<string, unknown> = {},
  referenceOverrides: Record<string, unknown> = {},
) {
  TestBed.overrideComponent(SearchScreen, {
    set: {
      providers: [
        { provide: AvailabilityStore, useValue: fakeAvailabilityStore(availabilityOverrides) },
      ],
    },
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [{ path: 'properties/:propertyId/search', component: SearchScreen }],
        withComponentInputBinding(),
      ),
      { provide: ReferenceDataStore, useValue: fakeReferenceDataStore(referenceOverrides) },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl(url, SearchScreen);
  harness.detectChanges();
  return { harness, component };
}

describe('SearchScreen', () => {
  it('no dates in the URL: prompts for dates, never fires a search', async () => {
    const search = vi.fn();
    const { harness } = await render('/properties/1/search', { search });
    expect(harness.routeNativeElement?.textContent).toContain(
      'Choose check-in and check-out dates to see available rooms.',
    );
    expect(search).not.toHaveBeenCalled();
  });

  it('valid dates already in the URL pre-populate the form and fire a search', async () => {
    const search = vi.fn();
    const { harness } = await render(
      '/properties/1/search?checkInDate=2099-06-01&checkOutDate=2099-06-05&roomTypeCode=KING',
      { search },
    );
    const checkInInput = harness.routeNativeElement?.querySelector<HTMLInputElement>(
      'input[name="checkInDate"]',
    );
    expect(checkInInput?.value).toBe('2099-06-01');
    const kingLabel = Array.from(harness.routeNativeElement?.querySelectorAll('label') ?? []).find(
      (label) => label.textContent?.includes('King'),
    );
    const kingCheckbox = kingLabel?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(kingCheckbox?.checked).toBe(true);
    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ checkInDate: '2099-06-01', checkOutDate: '2099-06-05' }),
    );
  });

  it('check-out before check-in shows the client-side message and never calls search', async () => {
    const search = vi.fn();
    const { harness } = await render(
      '/properties/1/search?checkInDate=2099-06-05&checkOutDate=2099-06-01',
      { search },
    );
    expect(harness.routeNativeElement?.textContent).toContain('Check-out must be after check-in.');
    expect(search).not.toHaveBeenCalled();
  });

  it('loading: shows skeletons', async () => {
    const { harness } = await render(
      '/properties/1/search?checkInDate=2099-06-01&checkOutDate=2099-06-05',
      { isLoading: signal(true) },
    );
    expect(
      harness.routeNativeElement?.querySelectorAll('[data-testid="result-skeleton"]').length,
    ).toBe(4);
  });

  it('empty is a success, not an error: renders "No rooms available" with recovery actions', async () => {
    const { harness } = await render(
      '/properties/1/search?checkInDate=2099-06-01&checkOutDate=2099-06-05',
      { isEmpty: signal(true) },
    );
    expect(harness.routeNativeElement?.textContent).toContain(
      'No rooms available for these dates.',
    );
    expect(harness.routeNativeElement?.textContent).toContain('Try different dates');
  });

  it('success: renders a result card with scarcity text and pricing', async () => {
    const { harness } = await render(
      '/properties/1/search?checkInDate=2099-06-01&checkOutDate=2099-06-05',
      {
        results: signal([result({ availableRoomCount: 2 })]),
        pagination: signal(pagination({ totalItems: 1 })),
      },
    );
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Deluxe King');
    expect(text).toContain('Only 2 rooms left');
    expect(text).toContain('$249.00');
  });

  it('error NOT_FOUND: "We couldn\'t find that hotel."', async () => {
    const { harness } = await render(
      '/properties/1/search?checkInDate=2099-06-01&checkOutDate=2099-06-05',
      { isError: signal(true), error: signal(new ApiError(404, 'NOT_FOUND', 'No such property.')) },
    );
    expect(harness.routeNativeElement?.textContent).toContain("We couldn't find that hotel.");
  });
});
