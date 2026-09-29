import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { ReferenceDataStore } from './reference-data.store';
import { apiInterceptor } from '../api/http.interceptor';

describe('ReferenceDataStore', () => {
  let httpMock: HttpTestingController;
  let store: InstanceType<typeof ReferenceDataStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ReferenceDataStore);
  });

  afterEach(() => httpMock.verify());

  it('loadOnce fetches both amenities and rate categories', () => {
    store.loadOnce();

    const amenitiesReq = httpMock.expectOne((r) => r.url.includes('/amenities'));
    amenitiesReq.flush([{ code: 'WIFI', name: 'Wi-Fi', sortOrder: 1 }]);
    const rateCategoriesReq = httpMock.expectOne((r) => r.url.includes('/rate-categories'));
    rateCategoriesReq.flush([{ value: 'AAA_CAA', label: 'AAA/CAA' }]);

    expect(store.amenities()).toEqual([{ code: 'WIFI', name: 'Wi-Fi', sortOrder: 1 }]);
    expect(store.rateCategories()).toEqual([{ value: 'AAA_CAA', label: 'AAA/CAA' }]);
  });

  it('a second loadOnce call after success is a no-op -- no second HTTP request', () => {
    store.loadOnce();
    httpMock.expectOne((r) => r.url.includes('/amenities')).flush([]);
    httpMock.expectOne((r) => r.url.includes('/rate-categories')).flush([]);

    store.loadOnce();
    httpMock.expectNone((r) => r.url.includes('/amenities'));
    httpMock.expectNone((r) => r.url.includes('/rate-categories'));
  });
});
