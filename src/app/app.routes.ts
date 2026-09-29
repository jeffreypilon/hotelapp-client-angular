import { CanDeactivateFn, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import type { PaymentScreen } from './features/booking/pages/payment-screen';

/** One route tree, per architecture-specification.md. Paths mirror ui-specifications.md. */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/properties/pages/property-list-screen').then((m) => m.PropertyListScreen),
  },
  {
    path: 'properties',
    loadComponent: () =>
      import('./features/properties/pages/property-list-screen').then((m) => m.PropertyListScreen),
  },
  {
    path: 'properties/:propertyIdOrSlug',
    loadComponent: () =>
      import('./features/properties/pages/property-detail-screen').then(
        (m) => m.PropertyDetailScreen,
      ),
  },
  {
    path: 'properties/:propertyId/search',
    loadComponent: () =>
      import('./features/search/pages/search-screen').then((m) => m.SearchScreen),
  },
  {
    path: 'properties/:propertyId/book',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/booking/pages/booking-summary-screen').then((m) => m.BookingSummaryScreen),
  },
  {
    path: 'properties/:propertyId/book/payment',
    canActivate: [authGuard],
    // A dynamic-import wrapper, not a static import of paymentCanDeactivateGuard -- a static
    // import here would pull PaymentScreen (and everything it depends on) into the main bundle,
    // defeating this route's own lazy loadComponent below.
    canDeactivate: [
      (...args: Parameters<CanDeactivateFn<PaymentScreen>>) =>
        import('./features/booking/pages/payment-screen').then((m) =>
          m.paymentCanDeactivateGuard(...args),
        ),
    ],
    loadComponent: () =>
      import('./features/booking/pages/payment-screen').then((m) => m.PaymentScreen),
  },
  {
    path: 'reservations/:reservationId/confirmation',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/booking/pages/confirmation-screen').then((m) => m.ConfirmationScreen),
  },
  {
    path: 'account/reservations',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/pages/reservation-list-screen').then(
        (m) => m.ReservationListScreen,
      ),
  },
  {
    path: 'account/reservations/:reservationId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/pages/reservation-detail-screen').then(
        (m) => m.ReservationDetailScreen,
      ),
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login-screen').then((m) => m.LoginScreen),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register-screen').then((m) => m.RegisterScreen),
  },
  {
    path: 'room-types/:roomTypeId',
    loadComponent: () =>
      import('./features/properties/pages/room-type-detail-screen').then(
        (m) => m.RoomTypeDetailScreen,
      ),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found-screen').then((m) => m.NotFoundScreen),
  },
];
