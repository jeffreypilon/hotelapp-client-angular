import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UrlTree, provideRouter } from '@angular/router';
import { managerGuard } from './manager.guard';
import { SessionStore } from '../core/session/session.store';
import type { Role, User } from '../core/api/types';

function fakeUser(role: Role, propertyId: string | null = null): User {
  return {
    id: '1',
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    role,
    propertyId,
  };
}

function state(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

describe('managerGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('admits only a Manager', () => {
    TestBed.inject(SessionStore).setUser(fakeUser('PROPERTY_MANAGER'));
    const result = TestBed.runInInjectionContext(() =>
      managerGuard({} as ActivatedRouteSnapshot, state('/admin/properties')),
    );
    expect(result).toBe(true);
  });

  it('denies Front Desk staff -- being at the right property does not grant the higher rank', () => {
    TestBed.inject(SessionStore).setUser(fakeUser('FRONT_DESK_STAFF', 'property-1'));
    const result = TestBed.runInInjectionContext(() =>
      managerGuard({} as ActivatedRouteSnapshot, state('/admin/properties')),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/');
  });

  it('returns a redirect UrlTree with next set when there is no session', () => {
    TestBed.inject(SessionStore).setAnonymous();
    const result = TestBed.runInInjectionContext(() =>
      managerGuard({} as ActivatedRouteSnapshot, state('/admin/properties')),
    );
    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/login');
    expect(tree.queryParams['next']).toBe('/admin/properties');
  });
});
