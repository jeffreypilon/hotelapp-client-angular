import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../api/auth.api';
import { ApiError } from '../api/api-error';
import { SessionStore } from './session.store';

/**
 * GET /auth/me during app init, per architecture-specification.md#application-configuration.
 * Must COMPLETE on a 401, never reject -- an anonymous visitor is not a startup failure. A
 * rejecting initializer hangs the whole app on a blank page, per environment-setup-guide.md's
 * own named failure mode.
 */
@Injectable({ providedIn: 'root' })
export class SessionInitializer {
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(SessionStore);

  async resolve(): Promise<void> {
    try {
      const { user } = await firstValueFrom(this.authApi.getMe());
      this.session.setUser(user);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'AUTHENTICATION_REQUIRED') {
        this.session.setAnonymous();
        return;
      }
      // NETWORK_ERROR (status 0), a CORS rejection masquerading as one, or anything else --
      // treat as anonymous-with-a-banner rather than a startup failure.
      this.session.setNetworkError();
    }
  }
}
