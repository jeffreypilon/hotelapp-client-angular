import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { SessionStore } from '../core/session/session.store';
import type { User } from '../core/api/types';

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    email: 'a@b.com',
    firstName: 'A',
    lastName: 'B',
    role: 'GUEST',
    propertyId: null,
    ...overrides,
  };
}

function state(url: string): RouterStateSnapshot {
  return { url } as RouterStateSnapshot;
}

describe('authGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('admits a request when a session exists', () => {
    TestBed.inject(SessionStore).setUser(fakeUser());
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, state('/account')),
    );
    expect(result).toBe(true);
  });

  it('returns a redirect UrlTree with next set when there is no session', () => {
    TestBed.inject(SessionStore).setAnonymous();
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, state('/account')),
    );
    expect(result).toBeInstanceOf(UrlTree);
    const tree = result as UrlTree;
    expect(tree.toString()).toContain('/login');
    expect(tree.queryParams['next']).toBe('/account');
  });
});
