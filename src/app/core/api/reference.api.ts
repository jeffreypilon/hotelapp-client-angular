import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { AmenityReference, RateCategoryOption } from './types';

/** Non-paginated reference lists, per api-contracts.md -- fetched once per session by ReferenceDataStore. */
@Injectable({ providedIn: 'root' })
export class ReferenceApi {
  private readonly http = inject(HttpClient);

  getAmenities(): Observable<AmenityReference[]> {
    return this.http.get<AmenityReference[]>('/amenities');
  }

  getRateCategories(): Observable<RateCategoryOption[]> {
    return this.http.get<RateCategoryOption[]>('/rate-categories');
  }
}
