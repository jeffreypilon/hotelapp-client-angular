import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { PropertiesStore } from './properties.store';
import { apiInterceptor } from '../../core/api/http.interceptor';
import type { PropertyDetail, PropertyListResponse, RoomType } from '../../core/api/types';

function response(overrides: Partial<PropertyListResponse> = {}): PropertyListResponse {
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

function propertyDetail(overrides: Partial<PropertyDetail> = {}): PropertyDetail {
  return {
    id: '1',
    name: 'Harborview Grand',
    slug: 'harborview-grand',
    description: '',
    photoUrl: null,
    address: {
      line1: '1 Harbor Way',
      line2: null,
      city: 'Portland',
      stateProvince: 'ME',
      postalCode: '04101',
      countryCode: 'US',
    },
    phone: null,
    timezone: 'America/New_York',
    roomTypeCount: 0,
    roomTypes: [],
    ...overrides,
  };
}

function roomType(overrides: Partial<RoomType> = {}): RoomType {
  return {
    id: 'rt-1',
    propertyId: '1',
    code: 'KING',
    name: 'Deluxe King',
    description: '',
    baseRate: '249.00',
    currency: 'USD',
    maxOccupancy: 2,
    bedConfiguration: 'one king bed',
    isAccessible: false,
    amenities: [],
    photos: [],
    ...overrides,
  };
}

describe('PropertiesStore', () => {
  let httpMock: HttpTestingController;
  let store: InstanceType<typeof PropertiesStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        PropertiesStore,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(PropertiesStore);
  });

  afterEach(() => httpMock.verify());

  it('transitions loading -> success', () => {
    store.load({ page: 1 });
    expect(store.status()).toBe('loading');

    const req = httpMock.expectOne((r) => r.url.includes('/properties'));
    req.flush(response({ data: [{ id: '1' } as never] }));

    expect(store.status()).toBe('success');
    expect(store.results().length).toBe(1);
  });

  it('isEmpty is false while loading, true only on an empty success', () => {
    store.load({ page: 1 });
    expect(store.isEmpty()).toBe(false);

    const req = httpMock.expectOne((r) => r.url.includes('/properties'));
    req.flush(response());

    expect(store.isEmpty()).toBe(true);
  });

  it('transitions loading -> error on a failed request, without killing the stream', () => {
    store.load({ page: 1 });
    const req = httpMock.expectOne((r) => r.url.includes('/properties'));
    req.flush(
      { code: 'INTERNAL_ERROR', detail: 'boom' },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(store.status()).toBe('error');
    expect(store.error()?.code).toBe('INTERNAL_ERROR');

    // A second call after an error must still work -- the rxMethod stream survived the error.
    store.load({ page: 2 });
    const req2 = httpMock.expectOne((r) => r.url.includes('/properties'));
    req2.flush(response());
    expect(store.status()).toBe('success');
  });

  it('a second in-flight call cancels/discards the first (switchMap)', () => {
    store.load({ page: 1, q: 'first' });
    const req1 = httpMock.expectOne((r) => r.urlWithParams.includes('q=first'));

    store.load({ page: 1, q: 'second' });
    // switchMap unsubscribes the first request's Observable; Angular's HttpClient genuinely
    // aborts the underlying HTTP request rather than merely discarding a late response.
    expect(req1.cancelled).toBe(true);

    const req2 = httpMock.expectOne((r) => r.urlWithParams.includes('q=second'));
    req2.flush(response({ data: [{ id: 'fresh' } as never] }));

    expect(store.results()[0]).toEqual(expect.objectContaining({ id: 'fresh' }));
  });

  it('loadProperty transitions loading -> success and NOT_FOUND is surfaced via error().code', () => {
    store.loadProperty('harborview-grand');
    expect(store.isDetailLoading()).toBe(true);

    const req = httpMock.expectOne((r) => r.url.includes('/properties/harborview-grand'));
    req.flush(propertyDetail({ name: 'Harborview Grand' }));

    expect(store.isDetailLoading()).toBe(false);
    expect(store.detail()?.name).toBe('Harborview Grand');

    store.loadProperty('unknown-slug');
    const req2 = httpMock.expectOne((r) => r.url.includes('/properties/unknown-slug'));
    req2.flush(
      { code: 'NOT_FOUND', detail: 'No such property.' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(store.isDetailError()).toBe(true);
    expect(store.detailError()?.code).toBe('NOT_FOUND');
  });

  it('isRoomTypesEmpty is false while loading, true only on an empty success', () => {
    store.loadRoomTypes('1');
    expect(store.isRoomTypesEmpty()).toBe(false);

    const req = httpMock.expectOne((r) => r.url.includes('/properties/1/room-types'));
    req.flush([]);

    expect(store.isRoomTypesEmpty()).toBe(true);

    store.loadRoomTypes('1');
    const req2 = httpMock.expectOne((r) => r.url.includes('/properties/1/room-types'));
    req2.flush([roomType()]);

    expect(store.isRoomTypesEmpty()).toBe(false);
    expect(store.roomTypes().length).toBe(1);
  });

  it('loadRoomType then clearRoomType resets state for the next dialog open', () => {
    store.loadRoomType('rt-1');
    const req = httpMock.expectOne((r) => r.url.includes('/room-types/rt-1'));
    req.flush(roomType({ id: 'rt-1', name: 'Deluxe King' }));

    expect(store.roomType()?.name).toBe('Deluxe King');

    store.clearRoomType();

    expect(store.roomType()).toBeNull();
    expect(store.isRoomTypeLoading()).toBe(false);
    expect(store.roomTypeError()).toBeNull();
  });
});
