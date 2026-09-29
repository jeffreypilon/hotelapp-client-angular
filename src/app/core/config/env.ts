/**
 * Runtime config access, validated once at startup -- per architecture-specification.md.
 * Prefers window.__HOTELAPP_CONFIG__ (set by public/config.js in a built bundle) so switching
 * backends never requires a rebuild; falls back to the compiled environment.ts value in dev.
 */
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    __HOTELAPP_CONFIG__?: { apiBaseUrl?: string };
  }
}

function readApiBaseUrl(): string {
  const fromRuntimeConfig = window.__HOTELAPP_CONFIG__?.apiBaseUrl;
  if (fromRuntimeConfig) {
    return fromRuntimeConfig;
  }

  if (environment.apiBaseUrl) {
    return environment.apiBaseUrl;
  }

  throw new Error(
    'No API base URL configured. Set environment.development.ts, or window.__HOTELAPP_CONFIG__.apiBaseUrl.',
  );
}

export const env = {
  apiBaseUrl: readApiBaseUrl(),
};
