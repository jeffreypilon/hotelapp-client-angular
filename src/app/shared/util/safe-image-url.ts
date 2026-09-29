import { Injectable, inject } from '@angular/core';
import { Logger } from './logger';

/**
 * Blocks javascript:/data: URLs from reaching an [src] binding -- per
 * security-implementation.md#xss. Every photo URL in this app is admin-entered data.
 */
@Injectable({ providedIn: 'root' })
export class SafeImageUrl {
  private readonly logger = inject(Logger);

  resolve(url: string | null): string | null {
    if (!url) return null;
    try {
      const u = new URL(url, window.location.origin);
      if (u.protocol === 'https:' || u.protocol === 'http:') return u.href;
      this.logger.warn('safeImageUrl rejected a non-http(s) URL', { url });
      return null;
    } catch {
      this.logger.warn('safeImageUrl rejected an unparseable URL', { url });
      return null;
    }
  }
}
