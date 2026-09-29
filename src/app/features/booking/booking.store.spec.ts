import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { BookingStore } from './booking.store';
import { apiInterceptor } from '../../core/api/http.interceptor';
import type { AvailabilityResult, Pagination, PropertyDetail } from '../../core/api/types';

function pagination(): Pagination {
  return {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
}

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

function availabilityResult(overrides: Partial<AvailabilityResult> = {}): AvailabilityResult {
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

const baseParams = {
  propertyId: 'p-1',
  roomTypeId: 'rt-1',
  checkInDate: '2099-06-01',
  checkOutDate: '2099-06-05',
  numGuests: 2,
  rateCategory: 'NONE',
};

describe('BookingStore', () => {
  let httpMock: HttpTestingController;
  let store: InstanceType<typeof BookingStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        BookingStore,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(BookingStore);
  });

  afterEach(() => httpMock.verify());

  it('loadContext fetches the property and searches availability, then finds the matching result', () => {
    store.loadContext(baseParams);

    httpMock.expectOne((r) => r.url.includes('/properties/p-1')).flush(property());
    httpMock
      .expectOne((r) => r.url.includes('/availability'))
      .flush({ data: [availabilityResult()], pagination: pagination() });

    expect(store.property()?.name).toBe('Harborview Grand');
    expect(store.result()?.roomType.id).toBe('rt-1');
    expect(store.notAvailable()).toBe(false);
    expect(store.isContextPending()).toBe(false);
  });

  it('notAvailable is true once availability succeeds with no matching room type -- not while still loading', () => {
    store.loadContext(baseParams);
    httpMock.expectOne((r) => r.url.includes('/properties/p-1')).flush(property());
    const availabilityReq = httpMock.expectOne((r) => r.url.includes('/availability'));

    // Still loading: "don't know yet", never "no longer available".
    expect(store.notAvailable()).toBe(false);

    availabilityReq.flush({ data: [], pagination: pagination() });
    expect(store.notAvailable()).toBe(true);
    expect(store.result()).toBeUndefined();
  });

  it('loadReservation fetches by id', () => {
    store.loadReservation('res-1');
    const req = httpMock.expectOne((r) => r.url.includes('/reservations/res-1'));
    req.flush({ id: 'res-1', confirmationNumber: 'HA1234' } as never);

    expect(store.reservation()?.id).toBe('res-1');
    expect(store.isReservationPending()).toBe(false);
  });
});
