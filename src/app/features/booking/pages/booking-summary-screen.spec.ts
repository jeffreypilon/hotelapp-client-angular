import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, withComponentInputBinding, Router } from '@angular/router';
import { signal } from '@angular/core';
import { BookingSummaryScreen } from './booking-summary-screen';
import { BookingStore } from '../booking.store';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import { SessionStore } from '../../../core/session/session.store';
import { authGuard } from '../../../guards/auth.guard';
import type { AvailabilityResult, PropertyDetail } from '../../../core/api/types';

function property(): PropertyDetail {
  return {
    id: 'p-1',
    name: 'Harborview Grand',
    slug: 'harborview-grand',
    description: '',
    photoUrl: null,
    address: {
      line1: '1 Bay St',
      line2: null,
      city: 'Springfield',
      stateProvince: 'CA',
      postalCode: '90210',
      countryCode: 'US',
    },
    phone: null,
    timezone: 'America/New_York',
    roomTypeCount: 1,
    roomTypes: [],
  };
}

function availabilityResult(): AvailabilityResult {
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
      nights: 4,
      totalAmount: '996.00',
      currency: 'USD',
    },
    availableRoomCount: 4,
  };
}

function fakeBookingStore(overrides: Record<string, unknown> = {}) {
  return {
    property: signal<PropertyDetail | null>(property()),
    result: signal<AvailabilityResult | undefined>(availabilityResult()),
    notAvailable: signal(false),
    isContextPending: signal(false),
    isContextError: signal(false),
    contextError: signal(null),
    loadContext: () => undefined,
    ...overrides,
  };
}

function fakeReferenceDataStore() {
  return {
    rateCategories: signal([]),
    isRateCategoriesLoading: signal(false),
    loadOnce: () => undefined,
  };
}

const bookingUrl =
  '/properties/p-1/book?roomTypeId=rt-1&checkInDate=2099-06-01&checkOutDate=2099-06-05&numGuests=2&rateCategory=NONE';

describe('BookingSummaryScreen', () => {
  it(
    'an anonymous guest is routed to login with the full booking context preserved in `next` -- ' +
      'guards the worst available UX failure in this application',
    async () => {
      TestBed.configureTestingModule({
        providers: [
          provideRouter(
            [
              {
                path: 'properties/:propertyId/book',
                component: BookingSummaryScreen,
                canActivate: [authGuard],
              },
              { path: 'login', component: BookingSummaryScreen },
            ],
            withComponentInputBinding(),
          ),
        ],
      });
      TestBed.inject(SessionStore).setAnonymous();
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(bookingUrl);

      const router = TestBed.inject(Router);
      expect(router.url.startsWith('/login')).toBe(true);
      expect(decodeURIComponent(router.url)).toContain(bookingUrl);
    },
  );

  it('renders the summary and a "Continue to payment" link carrying the same query forward', async () => {
    TestBed.overrideComponent(BookingSummaryScreen, {
      set: { providers: [{ provide: BookingStore, useValue: fakeBookingStore() }] },
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'properties/:propertyId/book', component: BookingSummaryScreen }],
          withComponentInputBinding(),
        ),
        { provide: ReferenceDataStore, useValue: fakeReferenceDataStore() },
      ],
    });
    TestBed.inject(SessionStore).setUser({
      id: '1',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
      role: 'GUEST',
      propertyId: null,
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(bookingUrl);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain('Review your booking');
    expect(harness.routeNativeElement?.textContent).toContain('Harborview Grand');
    const link = harness.routeNativeElement?.querySelector('a[href*="/book/payment"]');
    expect(link?.getAttribute('href')).toContain('roomTypeId=rt-1');
  });

  it('an unmatched availability result shows "no longer available" with a back-to-search link', async () => {
    TestBed.overrideComponent(BookingSummaryScreen, {
      set: {
        providers: [
          {
            provide: BookingStore,
            useValue: fakeBookingStore({ notAvailable: signal(true), result: signal(undefined) }),
          },
        ],
      },
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'properties/:propertyId/book', component: BookingSummaryScreen }],
          withComponentInputBinding(),
        ),
        { provide: ReferenceDataStore, useValue: fakeReferenceDataStore() },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(bookingUrl);
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Those dates are no longer available.',
    );
    const link = harness.routeNativeElement?.querySelector('a[href*="/search"]');
    expect(link?.getAttribute('href')).toContain('roomTypeId=rt-1');
  });
});
