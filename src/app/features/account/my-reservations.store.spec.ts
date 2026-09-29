import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { MyReservationsStore } from './my-reservations.store';
import { apiInterceptor } from '../../core/api/http.interceptor';
import type {
  CancelReservationResponse,
  Reservation,
  ReservationListResponse,
} from '../../core/api/types';

function listResponse(overrides: Partial<ReservationListResponse> = {}): ReservationListResponse {
  return {
    data: [],
    pagination: {
      page: 1,
      pageSize: 20,
      totalItems: 0,
      totalPages: 0,
      hasPreviousPage: false,
      hasNextPage: false,
    },
    ...overrides,
  };
}

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

describe('MyReservationsStore', () => {
  let httpMock: HttpTestingController;
  let store: InstanceType<typeof MyReservationsStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        MyReservationsStore,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(MyReservationsStore);
  });

  afterEach(() => httpMock.verify());

  it('loadList transitions loading -> success', () => {
    store.loadList({ from: '2026-09-29' });
    expect(store.isListLoading()).toBe(true);

    const req = httpMock.expectOne(
      (r) => r.url.includes('/reservations') && !r.url.includes('/reservations/'),
    );
    req.flush(listResponse({ data: [{ id: 'r-1' } as never] }));

    expect(store.isListLoading()).toBe(false);
    expect(store.list().length).toBe(1);
  });

  it('loadReservation transitions loading -> success', () => {
    store.loadReservation('r-1');
    const req = httpMock.expectOne((r) => r.url.endsWith('/reservations/r-1'));
    req.flush(reservation());

    expect(store.isReservationPending()).toBe(false);
    expect(store.reservation()?.id).toBe('r-1');
  });

  it('cancelReservation resolves with the outcome and reloads the reservation', async () => {
    const promise = store.cancelReservation('r-1');
    const cancelReq = httpMock.expectOne((r) => r.url.endsWith('/reservations/r-1/cancel'));
    const outcome: CancelReservationResponse = {
      id: 'r-1',
      confirmationNumber: 'HA1234ABCD',
      status: 'CANCELLED',
      cancelledAt: '2026-09-29T00:00:00Z',
      wasRefundable: true,
      refund: { status: 'REFUNDED', amount: '498.00', currency: 'USD' },
    };
    cancelReq.flush(outcome);

    const reloadReq = httpMock.expectOne((r) => r.url.endsWith('/reservations/r-1'));
    reloadReq.flush(reservation({ status: 'CANCELLED' }));

    await expect(promise).resolves.toEqual(outcome);
    expect(store.cancelOutcome()).toEqual(outcome);
  });

  it('cancelReservation on INVALID_STATUS_TRANSITION refetches the reservation and rejects', async () => {
    const promise = store.cancelReservation('r-1');
    const cancelReq = httpMock.expectOne((r) => r.url.endsWith('/reservations/r-1/cancel'));
    cancelReq.flush(
      { code: 'INVALID_STATUS_TRANSITION', detail: 'stale' },
      { status: 409, statusText: 'Conflict' },
    );

    const reloadReq = httpMock.expectOne((r) => r.url.endsWith('/reservations/r-1'));
    reloadReq.flush(reservation());

    await expect(promise).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
    expect(store.reservation()?.id).toBe('r-1');
  });

  it('patchReservation resolves with the updated reservation', async () => {
    const promise = store.patchReservation('r-1', { checkInDate: '2026-11-13' });
    const req = httpMock.expectOne((r) => r.url.endsWith('/reservations/r-1'));
    expect(req.request.method).toBe('PATCH');
    req.flush(reservation({ checkInDate: '2026-11-13' }));

    await expect(promise).resolves.toMatchObject({ checkInDate: '2026-11-13' });
  });
});
