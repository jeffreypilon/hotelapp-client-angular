import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { AvailabilityResponse } from './types';

export interface GetAvailabilityParams {
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  numGuests: number;
  roomTypeCode?: string[];
  rateCategory?: string;
  accessibleOnly?: boolean;
  amenityCode?: string[];
  minNightlyRate?: string;
  maxNightlyRate?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class AvailabilityApi {
  private readonly http = inject(HttpClient);

  getAvailability(params: GetAvailabilityParams): Observable<AvailabilityResponse> {
    let httpParams = new HttpParams()
      .set('propertyId', params.propertyId)
      .set('checkInDate', params.checkInDate)
      .set('checkOutDate', params.checkOutDate)
      .set('numGuests', params.numGuests);

    // .append per value, not .set -- a repeatable param would otherwise silently keep only the
    // last selected room type or amenity.
    for (const code of params.roomTypeCode ?? [])
      httpParams = httpParams.append('roomTypeCode', code);
    for (const code of params.amenityCode ?? [])
      httpParams = httpParams.append('amenityCode', code);
    if (params.rateCategory) httpParams = httpParams.set('rateCategory', params.rateCategory);
    if (params.accessibleOnly) httpParams = httpParams.set('accessibleOnly', 'true');
    if (params.minNightlyRate) httpParams = httpParams.set('minNightlyRate', params.minNightlyRate);
    if (params.maxNightlyRate) httpParams = httpParams.set('maxNightlyRate', params.maxNightlyRate);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.pageSize !== undefined) httpParams = httpParams.set('pageSize', params.pageSize);

    return this.http.get<AvailabilityResponse>('/availability', { params: httpParams });
  }
}
