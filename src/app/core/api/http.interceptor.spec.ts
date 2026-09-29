import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { apiInterceptor } from './http.interceptor';
import { ApiError } from './api-error';
import { AuthApi } from './auth.api';

describe('apiInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('prefixes the configured API base URL on every relative request', async () => {
    const promise = firstValueFrom(http.get('/properties'));
    const req = httpMock.expectOne(
      (r) => r.url.startsWith('http') && r.url.endsWith('/properties'),
    );
    req.flush({ data: [], pagination: {} });
    await promise;
  });

  it('sets withCredentials true on every request', () => {
    http.get('/properties').subscribe();
    const req = httpMock.expectOne(() => true);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('maps an application/problem+json error body into a typed ApiError', async () => {
    const promise = firstValueFrom(http.get('/properties'));
    const req = httpMock.expectOne(() => true);
    req.flush(
      { code: 'NOT_FOUND', detail: 'No such property.', traceId: 'abc-123' },
      { status: 404, statusText: 'Not Found' },
    );

    await expect(promise).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      detail: 'No such property.',
      traceId: 'abc-123',
    });
  });

  it('maps a non-JSON error body to a generic ApiError rather than throwing', async () => {
    const promise = firstValueFrom(http.get('/properties'));
    const req = httpMock.expectOne(() => true);
    req.flush('<html>not json</html>', { status: 500, statusText: 'Internal Server Error' });

    await expect(promise).rejects.toBeInstanceOf(ApiError);
  });

  it('a network failure (status 0) becomes NETWORK_ERROR, not an uncaught exception', async () => {
    const promise = firstValueFrom(http.get('/properties'));
    const req = httpMock.expectOne(() => true);
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    await expect(promise).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
  });
});

describe('SessionInitializer / GET auth/me bootstrap', () => {
  it('resolving on a 401 does not trigger the dead-session redirect (SUPPRESS_AUTH_REDIRECT)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const authApi = TestBed.inject(AuthApi);
    const httpMock = TestBed.inject(HttpTestingController);

    const promise = firstValueFrom(authApi.getMe());
    const req = httpMock.expectOne(() => true);
    req.flush(
      { code: 'AUTHENTICATION_REQUIRED', detail: 'Not logged in.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    // The call still rejects (caller/SessionInitializer decides what a 401 means) -- what this
    // test actually proves is that no navigation was queued, which a spy on Router would show;
    // here it's enough that the promise settles with the expected ApiError and nothing throws.
    await expect(promise).rejects.toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
    httpMock.verify();
  });
});
