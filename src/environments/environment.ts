// Production default. Overridden by environment.development.ts during `ng serve` / dev builds via
// angular.json's fileReplacements. A built bundle should normally get its apiBaseUrl from
// window.__HOTELAPP_CONFIG__ (public/config.js) instead -- see core/config/env.ts.
export const environment = {
  apiBaseUrl: '',
};
