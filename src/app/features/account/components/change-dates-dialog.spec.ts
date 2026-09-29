import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ChangeDatesDialog } from './change-dates-dialog';
import { MyReservationsStore } from '../my-reservations.store';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import type { Reservation } from '../../../core/api/types';

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 'r-1',
    confirmationNumber: 'HA1234ABCD',
    status: 'CONFIRMED',
    property: { id: 'p-1', name: 'Harborview Grand', timezone: 'America/New_York' },
    roomType: { id: 'rt-1', code: 'KING', name: 'Deluxe King' },
    room: { id: 'room-1', roomNumber: '201' },
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

function fakeReferenceDataStore() {
  return {
    amenities: signal([]),
    rateCategories: signal([{ value: 'NONE', label: 'None' }]),
    isAmenitiesLoading: signal(false),
    isRateCategoriesLoading: signal(false),
    loadOnce: () => undefined,
  };
}

describe('ChangeDatesDialog', () => {
  // Regression test: MyReservationsStore's real `reservation` signal is mutated to the *new*
  // pricing by the time the dialog's own submit() promise resolves (same signal the dialog's
  // `reservation` input is bound to in the real app) -- comparing against that live input at that
  // point would compare the new total to itself and silently drop the "(was $X)" clause. This is
  // exactly the bug found live during Step 6 manual verification: the confirmation read "Your
  // total is $747.00." instead of "Your new total is $747.00 (was $498.00)."
  it('states the old and new totals even though the store mutates the same reservation object in place', async () => {
    const patched = reservation({
      checkInDate: '2026-11-12',
      checkOutDate: '2026-11-15',
      nights: 3,
      pricing: {
        baseRate: '249.00',
        discountPercent: '0.00',
        nightlyRate: '249.00',
        totalAmount: '747.00',
        currency: 'USD',
      },
    });
    const reservationSignal = signal(reservation());
    const patchReservation = vi.fn().mockImplementation(() => {
      // Mirrors the real store: the `reservation` signal is overwritten with the new value
      // *before* the dialog's own await resolves, since patchState runs inside the same
      // Observable `next` callback that resolves this promise.
      reservationSignal.set(patched);
      return Promise.resolve(patched);
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: MyReservationsStore, useValue: { patchReservation } },
        { provide: ReferenceDataStore, useValue: fakeReferenceDataStore() },
      ],
    });
    const fixture = TestBed.createComponent(ChangeDatesDialog);
    fixture.componentRef.setInput('reservation', reservationSignal());
    fixture.detectChanges();

    await fixture.whenStable();
    await (fixture.componentInstance as unknown as { submit(): Promise<void> }).submit();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Your new total is $747.00 (was $498.00).');
  });
});
