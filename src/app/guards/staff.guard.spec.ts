import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UrlTree, provideRouter } from '@angular/router';
import { staffGuard } from './staff.guard';
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

describe('staffGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('admits Front Desk staff', () => {
    TestBed.inject(SessionStore).setUser(fakeUser('FRONT_DESK_STAFF'));
    const result = TestBed.runInInjectionContext(() =>
      staffGuard({} as ActivatedRouteSnapshot, state('/admin/reservations')),
    );
    expect(result).toBe(true);
  });

  it('admits a Manager too, without being separately enumerated', () => {
    TestBed.inject(SessionStore).setUser(fakeUser('PROPERTY_MANAGER'));
    const result = TestBed.runInInjectionContext(() =>
      staffGuard({} as ActivatedRouteSnapshot, state('/admin/reservations')),
    );
    expect(result).toBe(true);
  });

  it('denies a Guest by rank, even when scoped to the right property -- rank and scope are independent', () => {
    TestBed.inject(SessionStore).setUser(fakeUser('GUEST', 'property-1'));
    const result = TestBed.runInInjectionContext(() =>
      staffGuard({} as ActivatedRouteSnapshot, state('/admin/reservations')),
    );
    expect(result).toBeInstanceOf(UrlTree);
    expect((result as UrlTree).toString()).toBe('/');
  });

  it('returns a redirect UrlTree with next set when there is no session', () => {
    TestBed.inject(SessionStore).setAnonymous();
    const result = TestBed.runInInjectionContext(() =>
      staffGuard({} as ActivatedRouteSnapshot, state('/admin/reservations')),
    );
    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/login');
    expect(tree.queryParams['next']).toBe('/admin/reservations');
  });
});
