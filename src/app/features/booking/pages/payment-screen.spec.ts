import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, withComponentInputBinding, Router } from '@angular/router';
import { Component, signal } from '@angular/core';
import { of, throwError, type Observable } from 'rxjs';
import { PaymentScreen } from './payment-screen';
import { BookingStore } from '../booking.store';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import { ReservationsApi } from '../../../core/api/reservations.api';
import { ApiError } from '../../../core/api/api-error';
import type {
  AvailabilityResult,
  CreateReservationRequest,
  PropertyDetail,
  Reservation,
} from '../../../core/api/types';

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
      nights: 2,
      totalAmount: '498.00',
      currency: 'USD',
    },
    availableRoomCount: 4,
  };
}

function fakeReservation(): Reservation {
  return {
    id: 'res-1',
    confirmationNumber: 'HA1234',
    status: 'CONFIRMED',
    property: { id: 'p-1', name: 'Harborview Grand', timezone: 'America/New_York' },
    roomType: { id: 'rt-1', code: 'KING', name: 'Deluxe King' },
    room: { id: 'room-1', roomNumber: '101' },
    checkInDate: '2099-06-01',
    checkOutDate: '2099-06-05',
    nights: 4,
    numGuests: 2,
    rateCategory: 'NONE',
    pricing: {
      baseRate: '249.00',
      discountPercent: '0.00',
      nightlyRate: '249.00',
      totalAmount: '996.00',
      currency: 'USD',
    },
    cancellation: { deadline: '2099-05-30T04:00:00.000Z', isRefundableNow: true },
    payment: {
      status: 'APPROVED',
      cardBrand: 'VISA',
      cardLastFour: '4242',
      processedAt: '2099-01-01T00:00:00.000Z',
    },
    bookedAt: '2099-01-01T00:00:00.000Z',
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
    reservation: signal<Reservation | undefined>(undefined),
    isReservationPending: signal(false),
    isReservationError: signal(false),
    reservationErrorValue: signal(null),
    loadContext: () => undefined,
    loadReservation: () => undefined,
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

// White-box access for testing -- same `as unknown as {...}` cast pattern used throughout this
// codebase (see login-screen.spec.ts) rather than a production-code `any`.
interface PaymentScreenInternals {
  form: {
    controls: {
      cardholderName: { setValue(v: string): void };
      cardNumber: { setValue(v: string): void };
      expiryMonth: { setValue(v: string): void };
      expiryYear: { setValue(v: string): void };
      cvv: { setValue(v: string): void };
    };
  };
  onSubmit(): Promise<void>;
  idempotencyKey: string;
}

function internals(component: PaymentScreen): PaymentScreenInternals {
  return component as unknown as PaymentScreenInternals;
}

function fillValidCard(component: PaymentScreen): void {
  const { form } = internals(component);
  form.controls.cardholderName.setValue('Dana Reyes');
  form.controls.cardNumber.setValue('4242 4242 4242 4242');
  const futureYear = new Date().getUTCFullYear() + 2;
  form.controls.expiryMonth.setValue('12');
  form.controls.expiryYear.setValue(String(futureYear));
  form.controls.cvv.setValue('123');
}

/** A stand-in for routes this screen navigates to, so payment-screen.html never renders there. */
@Component({ selector: 'app-blank', template: '' })
class BlankScreen {}

async function render(
  createReservation: (body: CreateReservationRequest, key: string) => Observable<Reservation>,
  storeOverrides: Record<string, unknown> = {},
) {
  TestBed.overrideComponent(PaymentScreen, {
    set: {
      providers: [{ provide: BookingStore, useValue: fakeBookingStore(storeOverrides) }],
    },
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [
          { path: 'properties/:propertyId/book/payment', component: PaymentScreen },
          { path: 'reservations/:reservationId/confirmation', component: BlankScreen },
          { path: 'properties/:propertyId', component: BlankScreen },
        ],
        withComponentInputBinding(),
      ),
      { provide: ReferenceDataStore, useValue: fakeReferenceDataStore() },
      { provide: ReservationsApi, useValue: { createReservation } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl(
    '/properties/p-1/book/payment?roomTypeId=rt-1&checkInDate=2099-06-01&checkOutDate=2099-06-05&numGuests=2&rateCategory=NONE',
    PaymentScreen,
  );
  harness.detectChanges();
  return { harness, component };
}

describe('PaymentScreen', () => {
  it('the Idempotency-Key is identical across two submit attempts -- the single most valuable test in this suite', async () => {
    // ROOM_UNAVAILABLE is form-level, not field-level -- it never calls setErrors() on a control,
    // so the form stays valid and a second onSubmit() call actually reaches the API again (a
    // field-level code like PAYMENT_DECLINED would leave the card-number control invalid,
    // which is real, correct behavior but would block this test's second attempt for an
    // unrelated reason).
    const createReservation = vi.fn<
      (body: CreateReservationRequest, key: string) => Observable<Reservation>
    >(() => throwError(() => new ApiError(409, 'ROOM_UNAVAILABLE', 'Gone.')));
    const { component } = await render(createReservation);
    fillValidCard(component);

    await internals(component).onSubmit();
    await internals(component).onSubmit();

    expect(createReservation).toHaveBeenCalledTimes(2);
    const firstKey = createReservation.mock.calls[0][1];
    const secondKey = createReservation.mock.calls[1][1];
    expect(firstKey).toBe(secondKey);
    expect(internals(component).idempotencyKey).toBe(firstKey);
  });

  it('card number, CVV, and expiry never appear in the outgoing request body as raw form strings, nor in localStorage', async () => {
    const createReservation = vi.fn<
      (body: CreateReservationRequest, key: string) => Observable<Reservation>
    >(() => of(fakeReservation()));
    const { component } = await render(createReservation);
    fillValidCard(component);

    await internals(component).onSubmit();

    const body = createReservation.mock.calls[0][0];
    // The card number is sent digit-only (spaces stripped), never the display-formatted string.
    expect(body.payment.cardNumber).toBe('4242424242424242');
    expect(body.payment.cardNumber).not.toContain(' ');
    expect(localStorage.length).toBe(0);
  });

  it('a successful submission navigates to the confirmation route, replacing history', async () => {
    const createReservation = vi.fn<
      (body: CreateReservationRequest, key: string) => Observable<Reservation>
    >(() => of(fakeReservation()));
    const { harness, component } = await render(createReservation);
    fillValidCard(component);

    await internals(component).onSubmit();
    harness.detectChanges();

    const router = TestBed.inject(Router);
    expect(router.url).toBe('/reservations/res-1/confirmation');
  });

  it('PAYMENT_DECLINED shows a field-level message and keeps the form filled', async () => {
    const createReservation = vi.fn<
      (body: CreateReservationRequest, key: string) => Observable<Reservation>
    >(() => throwError(() => new ApiError(402, 'PAYMENT_DECLINED', 'This card was declined.')));
    const { harness, component } = await render(createReservation);
    fillValidCard(component);

    await internals(component).onSubmit();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'This card was declined. Please try another card.',
    );
    const { form } = internals(component) as unknown as {
      form: { controls: { cardNumber: { value: string } } };
    };
    expect(form.controls.cardNumber.value).toBe('4242 4242 4242 4242');
  });

  it('ROOM_UNAVAILABLE shows a prominent form-level message with a back-to-search link', async () => {
    const createReservation = vi.fn<
      (body: CreateReservationRequest, key: string) => Observable<Reservation>
    >(() => throwError(() => new ApiError(409, 'ROOM_UNAVAILABLE', 'Gone.')));
    const { harness, component } = await render(createReservation);
    fillValidCard(component);

    await internals(component).onSubmit();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Those dates are no longer available. Someone else may have booked the last room.',
    );
  });
});
