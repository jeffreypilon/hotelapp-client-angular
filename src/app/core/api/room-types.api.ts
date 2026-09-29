import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { RoomType } from './types';

@Injectable({ providedIn: 'root' })
export class RoomTypesApi {
  private readonly http = inject(HttpClient);

  getRoomTypes(propertyId: string): Observable<RoomType[]> {
    return this.http.get<RoomType[]>(`/properties/${encodeURIComponent(propertyId)}/room-types`);
  }

  getRoomType(roomTypeId: string): Observable<RoomType> {
    return this.http.get<RoomType>(`/room-types/${encodeURIComponent(roomTypeId)}`);
  }
}
