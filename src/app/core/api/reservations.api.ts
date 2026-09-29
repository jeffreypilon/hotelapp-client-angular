import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  CancelReservationResponse,
  CreateReservationRequest,
  PatchReservationRequest,
  Reservation,
  ReservationListResponse,
} from './types';

export interface ListReservationsParams {
  status?: string[];
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
}

/** One injectable service per contract resource, per architecture-specification.md. */
@Injectable({ providedIn: 'root' })
export class ReservationsApi {
  private readonly http = inject(HttpClient);

  /** idempotencyKey guards a double-click submit -- generated once on mount, per ui-specifications.md S6. */
  createReservation(
    body: CreateReservationRequest,
    idempotencyKey: string,
  ): Observable<Reservation> {
    return this.http.post<Reservation>('/reservations', body, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
    });
  }

  getReservation(reservationId: string): Observable<Reservation> {
    return this.http.get<Reservation>(`/reservations/${encodeURIComponent(reservationId)}`);
  }

  listReservations(params: ListReservationsParams): Observable<ReservationListResponse> {
    // .append per value -- a repeatable param would otherwise silently keep only the last status.
    let search = new HttpParams();
    for (const status of params.status ?? []) search = search.append('status', status);
    if (params.from) search = search.set('from', params.from);
    if (params.to) search = search.set('to', params.to);
    if (params.page !== undefined) search = search.set('page', String(params.page));
    if (params.pageSize !== undefined) search = search.set('pageSize', String(params.pageSize));
    if (params.sort) search = search.set('sort', params.sort);
    return this.http.get<ReservationListResponse>('/reservations', { params: search });
  }

  patchReservation(reservationId: string, body: PatchReservationRequest): Observable<Reservation> {
    return this.http.patch<Reservation>(`/reservations/${encodeURIComponent(reservationId)}`, body);
  }

  /** reason is accepted and ignored server-side (reserved for a future audit field), per api-contracts.md. */
  cancelReservation(reservationId: string, reason?: string): Observable<CancelReservationResponse> {
    return this.http.post<CancelReservationResponse>(
      `/reservations/${encodeURIComponent(reservationId)}/cancel`,
      reason !== undefined ? { reason } : undefined,
    );
  }
}
