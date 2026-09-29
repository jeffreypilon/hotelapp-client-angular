import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { CreateReservationRequest, Reservation } from './types';

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
}
