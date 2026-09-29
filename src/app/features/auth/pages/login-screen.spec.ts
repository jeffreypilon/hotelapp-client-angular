import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { Router, provideRouter } from '@angular/router';
import type { FormControl, FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { LoginScreen } from './login-screen';
import { AuthApi, type MeResponse } from '../../../core/api/auth.api';
import { ApiError } from '../../../core/api/api-error';
import { SessionStore } from '../../../core/session/session.store';
import type { User } from '../../../core/api/types';

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    email: 'guest@example.com',
    firstName: 'Dana',
    lastName: 'Reyes',
    role: 'GUEST',
    propertyId: null,
    ...overrides,
  };
}

function fakeAuthApi(overrides: Partial<AuthApi> = {}) {
  return {
    login: () => of<MeResponse>({ user: fakeUser() }),
    register: () => of<MeResponse>({ user: fakeUser() }),
    getMe: () => of<MeResponse>({ user: fakeUser() }),
    logout: () => of(undefined),
    ...overrides,
  };
}

// White-box access to LoginScreen's `protected` form/onSubmit for testing, per this codebase's
// established `as unknown as {...}` cast pattern rather than a production-code `any`.
interface LoginScreenInternals {
  form: FormGroup<{ email: FormControl<string>; password: FormControl<string> }>;
  onSubmit(): Promise<void>;
}

function internals(component: LoginScreen): LoginScreenInternals {
  return component as unknown as LoginScreenInternals;
}

async function render(url: string, authApiOverrides: Partial<AuthApi> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'login', component: LoginScreen },
        { path: '', component: LoginScreen },
      ]),
      { provide: AuthApi, useValue: fakeAuthApi(authApiOverrides) },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl(url, LoginScreen);
  harness.detectChanges();
  return { harness, component };
}

describe('LoginScreen', () => {
  it('an empty submit shows required errors on both fields and never calls login', async () => {
    const login = vi.fn(() => of<MeResponse>({ user: fakeUser() }));
    const { harness, component } = await render('/login', { login });

    await internals(component).onSubmit();
    harness.detectChanges();

    expect(login).not.toHaveBeenCalled();
    expect(harness.routeNativeElement?.textContent).toContain('This field is required.');
  });

  it('INVALID_CREDENTIALS renders a form-level message, never attached to a field', async () => {
    const { harness, component } = await render('/login', {
      login: () =>
        throwError(
          () => new ApiError(401, 'INVALID_CREDENTIALS', 'That email or password is incorrect.'),
        ),
    });
    const { form } = internals(component);
    form.controls.email.setValue('guest@example.com');
    form.controls.password.setValue('whatever');

    await internals(component).onSubmit();
    harness.detectChanges();

    expect(form.controls.email.errors).toBeNull();
    expect(form.controls.password.errors).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain(
      'That email or password is incorrect.',
    );
  });

  it('VALIDATION_FAILED applies a server field error to the matching control', async () => {
    const { harness, component } = await render('/login', {
      login: () =>
        throwError(
          () =>
            new ApiError(400, 'VALIDATION_FAILED', 'Invalid.', undefined, [
              { field: 'email', code: 'INVALID_EMAIL', message: 'ignored' },
            ]),
        ),
    });
    const { form } = internals(component);
    form.controls.email.setValue('not-an-email');
    form.controls.password.setValue('whatever');

    await internals(component).onSubmit();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Please enter a valid email address.',
    );
  });

  it('RATE_LIMITED shows the countdown message and disables the submit button', async () => {
    const { harness, component } = await render('/login', {
      login: () =>
        throwError(() => new ApiError(429, 'RATE_LIMITED', 'Too many.', undefined, undefined, 30)),
    });
    const { form } = internals(component);
    form.controls.email.setValue('guest@example.com');
    form.controls.password.setValue('whatever');

    await internals(component).onSubmit();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'Too many attempts. Please try again in a few minutes.',
    );
    expect(harness.routeNativeElement?.textContent).toContain('Try again in 30s.');
    const button = harness.routeNativeElement?.querySelector('button[type="submit"]');
    expect(button?.hasAttribute('disabled')).toBe(true);
  });

  it('successful login patches the session and routes by role', async () => {
    const { component } = await render('/login', {
      login: () => of<MeResponse>({ user: fakeUser({ role: 'GUEST' }) }),
    });
    const session = TestBed.inject(SessionStore);
    const { form } = internals(component);
    form.controls.email.setValue('guest@example.com');
    form.controls.password.setValue('correct horse battery staple');

    await internals(component).onSubmit();

    expect(session.user()?.email).toBe('guest@example.com');
  });

  it('a `next` query param is preferred over the role-based redirect', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: LoginScreen },
          { path: 'account', component: LoginScreen },
        ]),
        { provide: AuthApi, useValue: fakeAuthApi() },
      ],
    });
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/login?next=%2Faccount', LoginScreen);
    harness.detectChanges();
    const router = TestBed.inject(Router);

    const { form } = internals(component);
    form.controls.email.setValue('guest@example.com');
    form.controls.password.setValue('correct horse battery staple');
    await internals(component).onSubmit();

    expect(router.url).toBe('/account');
  });
});
