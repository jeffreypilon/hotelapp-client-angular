import { Routes } from '@angular/router';

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
