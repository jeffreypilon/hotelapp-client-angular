import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { PropertyDetail, PropertyListResponse } from './types';

export interface ListPropertiesParams {
  page?: number;
  pageSize?: number;
  /** Contract format: "<field>:<asc|desc>", e.g. "name:asc" -- GET /properties sorts by name or city. */
  sort?: string;
  city?: string;
  q?: string;
}

@Injectable({ providedIn: 'root' })
export class PropertiesApi {
  private readonly http = inject(HttpClient);

  listProperties(params: ListPropertiesParams = {}): Observable<PropertyListResponse> {
    let httpParams = new HttpParams();
    // !== undefined, not truthiness -- page=0 is invalid input that must reach the server as-is
    // (and come back a 400), not be silently dropped because 0 is falsy.
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page);
    if (params.pageSize !== undefined) httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.city) httpParams = httpParams.set('city', params.city);
    if (params.q) httpParams = httpParams.set('q', params.q);

    return this.http.get<PropertyListResponse>('/properties', { params: httpParams });
  }

  /** propertyIdOrSlug passes through unchanged -- the server disambiguates UUID vs. slug. */
  getProperty(propertyIdOrSlug: string): Observable<PropertyDetail> {
    return this.http.get<PropertyDetail>(`/properties/${encodeURIComponent(propertyIdOrSlug)}`);
  }
}
