import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter } from '@angular/router';
import type { FormControl, FormGroup } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { RegisterScreen } from './register-screen';
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

// White-box access to RegisterScreen's `protected` form/onSubmit for testing, per this codebase's
// established `as unknown as {...}` cast pattern rather than a production-code `any`.
interface RegisterScreenInternals {
  form: FormGroup<{
    firstName: FormControl<string>;
    lastName: FormControl<string>;
    email: FormControl<string>;
    password: FormControl<string>;
    phone: FormControl<string>;
  }>;
  onSubmit(): Promise<void>;
}

function internals(component: RegisterScreen): RegisterScreenInternals {
  return component as unknown as RegisterScreenInternals;
}

async function render(url: string, authApiOverrides: Partial<AuthApi> = {}) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'register', component: RegisterScreen },
        { path: '', component: RegisterScreen },
      ]),
      { provide: AuthApi, useValue: fakeAuthApi(authApiOverrides) },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl(url, RegisterScreen);
  harness.detectChanges();
  return { harness, component };
}

function fillValidForm(component: RegisterScreen): void {
  internals(component).form.setValue({
    firstName: 'Dana',
    lastName: 'Reyes',
    email: 'guest@example.com',
    // 20 chars -- within the 12-24 range; the React client's own "correct horse battery staple"
    // fixture is 29 chars and would trip this form's own maxLength(24) validator.
    password: 'correct horse staple',
    phone: '',
  });
}

describe('RegisterScreen', () => {
  it('the password hint shows a length range with no character-class requirement', async () => {
    const { harness } = await render('/register');
    expect(harness.routeNativeElement?.textContent).toContain('12–24 characters');
    expect(harness.routeNativeElement?.textContent).not.toMatch(/symbol|uppercase|strength/i);
  });

  it('a phone number is masked live as it is typed', async () => {
    const { harness, component } = await render('/register');
    const { form } = internals(component);
    form.controls.phone.setValue('2035550100');
    harness.detectChanges();
    expect(form.controls.phone.value).toBe('(203) 555-0100');
  });

  it('an incomplete phone number shows the client-side message', async () => {
    const { harness, component } = await render('/register');
    const { form } = internals(component);
    form.controls.phone.setValue('203555');
    form.controls.phone.markAsTouched();
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain(
      'Please enter a complete 10-digit phone number.',
    );
  });

  it('EMAIL_ALREADY_REGISTERED attaches a field error to email with a link to log in', async () => {
    const { harness, component } = await render('/register', {
      register: () =>
        throwError(
          () =>
            new ApiError(
              409,
              'EMAIL_ALREADY_REGISTERED',
              'An account with this email already exists.',
            ),
        ),
    });
    fillValidForm(component);

    await internals(component).onSubmit();
    harness.detectChanges();

    expect(harness.routeNativeElement?.textContent).toContain(
      'An account with this email already exists.',
    );
    expect(harness.routeNativeElement?.textContent).toContain('Log in instead');
  });

  it('successful registration patches the session, the same as login', async () => {
    const { component } = await render('/register', {
      register: () => of<MeResponse>({ user: fakeUser({ email: 'new@example.com' }) }),
    });
    const session = TestBed.inject(SessionStore);
    fillValidForm(component);

    await internals(component).onSubmit();

    expect(session.user()?.email).toBe('new@example.com');
  });
});
