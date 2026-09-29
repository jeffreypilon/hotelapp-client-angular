import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { ChangePasswordRequest, PatchProfileRequest, Profile } from './types';

/** One injectable service per contract resource, per architecture-specification.md. */
@Injectable({ providedIn: 'root' })
export class MeApi {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<Profile> {
    return this.http.get<Profile>('/me');
  }

  patchProfile(body: PatchProfileRequest): Observable<Profile> {
    return this.http.patch<Profile>('/me', body);
  }

  /** 204 No Content -- revokes every other session, but the caller's own session stays valid. */
  changePassword(body: ChangePasswordRequest): Observable<void> {
    return this.http.put<void>('/me/password', body);
  }
}
