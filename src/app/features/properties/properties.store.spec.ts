import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { PropertiesStore } from './properties.store';
import { apiInterceptor } from '../../core/api/http.interceptor';
import type { PropertyListResponse } from '../../core/api/types';

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
});
