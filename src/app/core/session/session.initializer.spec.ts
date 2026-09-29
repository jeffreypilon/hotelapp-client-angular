import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { apiInterceptor } from '../api/http.interceptor';
import { SessionInitializer } from './session.initializer';
import { SessionStore } from './session.store';

describe('SessionInitializer', () => {
  let httpMock: HttpTestingController;
  let initializer: SessionInitializer;
  let session: InstanceType<typeof SessionStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    initializer = TestBed.inject(SessionInitializer);
    session = TestBed.inject(SessionStore);
  });

  it('resolves (never rejects) on a bootstrap 401 -- an anonymous visitor is not a startup failure', async () => {
    const promise = initializer.resolve();
    const req = httpMock.expectOne(() => true);
    req.flush(
      { code: 'AUTHENTICATION_REQUIRED', detail: 'Not logged in.' },
      { status: 401, statusText: 'Unauthorized' },
    );

    await expect(promise).resolves.toBeUndefined();
    expect(session.isResolved()).toBe(true);
    expect(session.user()).toBeNull();
  });

  it('resolves with the user set on a 200', async () => {
    const promise = initializer.resolve();
    const req = httpMock.expectOne(() => true);
    req.flush({
      user: {
        id: '1',
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        role: 'GUEST',
        propertyId: null,
      },
    });

    await promise;
    expect(session.isResolved()).toBe(true);
    expect(session.user()?.firstName).toBe('A');
  });

  it('a network failure sets networkError rather than rejecting', async () => {
    const promise = initializer.resolve();
    const req = httpMock.expectOne(() => true);
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    await expect(promise).resolves.toBeUndefined();
    expect(session.isResolved()).toBe(true);
    expect(session.networkError()).toBe(true);
  });
});
