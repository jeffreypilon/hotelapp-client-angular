import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SUPPRESS_AUTH_REDIRECT } from './http.interceptor';
import type { User } from './types';

export interface MeResponse {
  user: User;
}

/** One injectable service per contract resource, per architecture-specification.md. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  /** A 401 here is the expected anonymous answer, not a dead session -- suppress the redirect rule. */
  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>('/auth/me', {
      context: new HttpContext().set(SUPPRESS_AUTH_REDIRECT, true),
    });
  }

  logout(): Observable<void> {
    return this.http.post<void>('/auth/logout', {});
  }
}
