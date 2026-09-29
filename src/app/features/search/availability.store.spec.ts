import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AvailabilityStore } from './availability.store';
import { apiInterceptor } from '../../core/api/http.interceptor';
import type { AvailabilityResponse } from '../../core/api/types';

function response(overrides: Partial<AvailabilityResponse> = {}): AvailabilityResponse {
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

const baseParams = {
  propertyId: '1',
  checkInDate: '2099-06-01',
  checkOutDate: '2099-06-05',
  numGuests: 2,
};

describe('AvailabilityStore', () => {
  let httpMock: HttpTestingController;
  let store: InstanceType<typeof AvailabilityStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        AvailabilityStore,
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(AvailabilityStore);
  });

  afterEach(() => httpMock.verify());

  it('transitions loading -> success', () => {
    store.search(baseParams);
    expect(store.status()).toBe('loading');

    const req = httpMock.expectOne((r) => r.url.includes('/availability'));
    req.flush(response({ data: [{ roomType: { id: 'rt-1' } } as never] }));

    expect(store.status()).toBe('success');
    expect(store.results().length).toBe(1);
  });

  it('isEmpty is false while loading, true only on an empty success', () => {
    store.search(baseParams);
    expect(store.isEmpty()).toBe(false);

    const req = httpMock.expectOne((r) => r.url.includes('/availability'));
    req.flush(response());

    expect(store.isEmpty()).toBe(true);
  });

  it('transitions loading -> error on a failed request, without killing the stream', () => {
    store.search(baseParams);
    const req = httpMock.expectOne((r) => r.url.includes('/availability'));
    req.flush(
      { code: 'INTERNAL_ERROR', detail: 'boom' },
      { status: 500, statusText: 'Internal Server Error' },
    );

    expect(store.status()).toBe('error');
    expect(store.error()?.code).toBe('INTERNAL_ERROR');

    store.search(baseParams);
    const req2 = httpMock.expectOne((r) => r.url.includes('/availability'));
    req2.flush(response());
    expect(store.status()).toBe('success');
  });

  it('a slow first response never overwrites a faster second one (switchMap discards the stale one)', () => {
    store.search({ ...baseParams, numGuests: 1 });
    const req1 = httpMock.expectOne((r) => r.urlWithParams.includes('numGuests=1'));

    store.search({ ...baseParams, numGuests: 2 });
    // switchMap unsubscribes the first request's Observable; Angular's HttpClient genuinely
    // cancels the underlying HTTP request rather than merely discarding a late response.
    expect(req1.cancelled).toBe(true);

    const req2 = httpMock.expectOne((r) => r.urlWithParams.includes('numGuests=2'));
    req2.flush(response({ data: [{ roomType: { id: 'fresh' } } as never] }));

    expect(store.results()[0]).toEqual(
      expect.objectContaining({ roomType: expect.objectContaining({ id: 'fresh' }) }),
    );
  });
});
