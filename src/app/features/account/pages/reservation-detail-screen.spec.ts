import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { signal } from '@angular/core';
import { ReservationDetailScreen } from './reservation-detail-screen';
import { MyReservationsStore } from '../my-reservations.store';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import { ApiError } from '../../../core/api/api-error';
import type { Reservation } from '../../../core/api/types';

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r-1',
    confirmationNumber: 'HA1234ABCD',
    status: 'CONFIRMED',
    property: { id: 'p-1', name: 'Harborview Grand', timezone: 'America/New_York' },
    roomType: { id: 'rt-1', code: 'KING', name: 'Deluxe King' },
    room: { id: 'room-1', roomNumber: '204' },
    checkInDate: '2026-11-12',
    checkOutDate: '2026-11-14',
    nights: 2,
    numGuests: 2,
    rateCategory: 'NONE',
    pricing: {
      baseRate: '249.00',
      discountPercent: '0.00',
      nightlyRate: '249.00',
      totalAmount: '498.00',
      currency: 'USD',
    },
    cancellation: { deadline: '2026-11-10T05:00:00Z', isRefundableNow: true },
    payment: {
      status: 'CAPTURED',
      cardBrand: 'VISA',
      cardLastFour: '4242',
      processedAt: '2026-09-01T00:00:00Z',
    },
    bookedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

// Per testing-standards.md's component-tests section: a page component's rendering is tested
// against a stub store, not a real store and real HTTP.
function fakeStore(overrides: Record<string, unknown> = {}) {
  return {
    reservation: signal<Reservation | null>(null),
    isReservationPending: signal(false),
    isReservationError: signal(false),
    reservationError: signal<ApiError | null>(null),
    loadReservation: () => undefined,
    cancelReservation: () => Promise.resolve(),
    patchReservation: () => Promise.resolve(),
    ...overrides,
  };
}

function fakeReferenceDataStore() {
  return {
    amenities: signal([]),
    rateCategories: signal([]),
    isAmenitiesLoading: signal(false),
    isRateCategoriesLoading: signal(false),
    loadOnce: () => undefined,
  };
}

async function render(url: string, storeOverrides: Record<string, unknown> = {}) {
  TestBed.overrideComponent(ReservationDetailScreen, {
    set: { providers: [{ provide: MyReservationsStore, useValue: fakeStore(storeOverrides) }] },
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [{ path: 'account/reservations/:reservationId', component: ReservationDetailScreen }],
        withComponentInputBinding(),
      ),
      { provide: ReferenceDataStore, useValue: fakeReferenceDataStore() },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl(url, ReservationDetailScreen);
  harness.detectChanges();
  return { harness, component };
}

// Per testing-standards.md's S8c requirement: the full status x isRefundableNow matrix from
// ui-specifications.md's table, as one parameterized test, not a handful of spot checks.
describe('ReservationDetailScreen -- action availability across status x deadline', () => {
  const cases: {
    status: string;
    isRefundableNow: boolean;
    expectedText: string[];
    notExpectedText: string[];
  }[] = [
    {
      status: 'CONFIRMED',
      isRefundableNow: true,
      expectedText: ['Change dates', 'Cancel reservation'],
      notExpectedText: ['non-refundable', 'currently checked in', 'stay is complete'],
    },
    {
      status: 'CONFIRMED',
      isRefundableNow: false,
      expectedText: [
        'Changes are no longer available for this reservation.',
        'Cancel reservation (non-refundable)',
      ],
      notExpectedText: ['Change dates'],
    },
    {
      status: 'CHECKED_IN',
      isRefundableNow: false,
      expectedText: ["You're currently checked in."],
      notExpectedText: ['Change dates', 'Cancel reservation'],
    },
    {
      status: 'CHECKED_OUT',
      isRefundableNow: false,
      expectedText: ['This stay is complete.'],
      notExpectedText: ['Change dates', 'Cancel reservation'],
    },
    {
      status: 'CANCELLED',
      isRefundableNow: true,
      expectedText: ['This reservation was cancelled.', 'It was refundable.'],
      notExpectedText: ['Change dates', 'Cancel reservation'],
    },
    {
      status: 'CANCELLED',
      isRefundableNow: false,
      expectedText: ['This reservation was cancelled.', 'It was non-refundable.'],
      notExpectedText: ['Change dates', 'Cancel reservation'],
    },
  ];

  for (const { status, isRefundableNow, expectedText, notExpectedText } of cases) {
    it(`status=${status}, isRefundableNow=${isRefundableNow}`, async () => {
      const { harness } = await render('/account/reservations/r-1', {
        reservation: signal(
          reservation({
            status,
            cancellation: { deadline: '2026-11-10T05:00:00Z', isRefundableNow },
          }),
        ),
      });
      const text = harness.routeNativeElement?.textContent ?? '';
      for (const expected of expectedText) expect(text).toContain(expected);
      for (const notExpected of notExpectedText) expect(text).not.toContain(notExpected);
    });
  }
});

describe('ReservationDetailScreen', () => {
  it('loading: shows a skeleton', async () => {
    const { harness } = await render('/account/reservations/r-1', {
      isReservationPending: signal(true),
    });
    expect(harness.routeNativeElement?.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('error: shows the resolved message and a link back to the list', async () => {
    const { harness } = await render('/account/reservations/r-1', {
      isReservationError: signal(true),
      reservationError: signal(new ApiError(404, 'NOT_FOUND', 'no such reservation')),
    });
    expect(harness.routeNativeElement?.textContent).toContain("We couldn't find that reservation.");
  });

  it('clicking "Cancel reservation" mounts the cancel dialog', async () => {
    const { harness } = await render('/account/reservations/r-1', {
      reservation: signal(reservation()),
    });
    const button = Array.from(harness.routeNativeElement?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === 'Cancel reservation',
    );
    button?.click();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('app-cancel-dialog')).toBeTruthy();
  });

  it('clicking "Change dates" mounts the change-dates dialog', async () => {
    const { harness } = await render('/account/reservations/r-1', {
      reservation: signal(reservation()),
    });
    const button = Array.from(harness.routeNativeElement?.querySelectorAll('button') ?? []).find(
      (b) => b.textContent?.trim() === 'Change dates',
    );
    button?.click();
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('app-change-dates-dialog')).toBeTruthy();
  });
});
