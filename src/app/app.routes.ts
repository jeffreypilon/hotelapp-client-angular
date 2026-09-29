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
];
