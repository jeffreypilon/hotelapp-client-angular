import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../../core/api/auth.api';
import { ApiError } from '../../../core/api/api-error';
import { SessionStore } from '../../../core/session/session.store';
import { roleRank } from '../../../guards/role-rank';
import { fieldMessage, resolveError } from '../../../shared/util/errors/messages';
import { AuthLayout } from '../components/auth-layout';
import { PasswordField } from '../components/password-field';
import { createRetryCountdown } from '../util/retry-countdown';

/**
 * S5 login, per ui-specifications.md. On success: patch SessionStore directly (no redundant
 * GET /auth/me), then route to `?next=` if present, else by role.
 */
@Component({
  selector: 'app-login-screen',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, PasswordField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-screen.html',
})
export class LoginScreen {
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly retryCountdown = createRetryCountdown();

  protected readonly seconds = this.retryCountdown.seconds;
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly next = () => this.queryParamMap().get('next');
  protected readonly registerQueryParams = () => (this.next() ? { next: this.next() } : {});

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(320)],
    }),
    // Deliberately no shape validation beyond "required" -- this verifies an EXISTING credential,
    // per ui-specifications.md's input-validation exemption.
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly disabled = () => this.isSubmitting() || this.seconds() > 0;

  protected emailError(): string | null {
    const control = this.form.controls.email;
    const serverError = control.errors?.['server'] as string | undefined;
    if (serverError) return serverError;
    if (!control.touched || control.valid) return null;
    if (control.errors?.['required']) return 'This field is required.';
    if (control.errors?.['email']) return 'Please enter a valid email address.';
    if (control.errors?.['maxlength']) return 'Please enter a shorter email address.';
    return 'Please check this field.';
  }

  protected passwordError(): string | null {
    const control = this.form.controls.password;
    const serverError = control.errors?.['server'] as string | undefined;
    if (serverError) return serverError;
    if (!control.touched || control.valid) return null;
    return 'This field is required.';
  }

  protected async onSubmit(): Promise<void> {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.isSubmitting.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      const response = await firstValueFrom(this.authApi.login({ email, password }));
      this.session.setUser(response.user);
      const next = this.next();
      if (next) {
        await this.router.navigateByUrl(next);
        return;
      }
      // Phase 6 items 9-12's admin routes don't exist yet -- this 404s to S15, same deferred
      // pattern the React client's Step 4 used.
      await this.router.navigate([
        roleRank[response.user.role] >= roleRank.FRONT_DESK_STAFF ? '/admin/reservations' : '/',
      ]);
    } catch (err) {
      this.handleError(err);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private handleError(err: unknown): void {
    this.formError.set(null);
    if (!(err instanceof ApiError)) {
      this.formError.set(
        "We couldn't reach the server. Please check your connection and try again.",
      );
      return;
    }
    if (err.code === 'VALIDATION_FAILED' && err.errors && err.errors.length > 0) {
      for (const fe of err.errors) {
        this.form.get(fe.field)?.setErrors({ server: fieldMessage(fe) });
      }
      this.focusFirstInvalid();
      return;
    }
    const resolved = resolveError(err);
    if (resolved.shape === 'field' && resolved.field) {
      const control = this.form.get(resolved.field);
      if (control) {
        control.setErrors({ server: resolved.message });
        this.focusFirstInvalid();
        return;
      }
    }
    this.formError.set(resolved.message);
    if (resolved.retryAfterSeconds !== undefined) {
      this.retryCountdown.start(resolved.retryAfterSeconds);
    }
  }

  private focusFirstInvalid(): void {
    for (const name of Object.keys(this.form.controls)) {
      if (this.form.get(name)?.invalid) {
        document.getElementById(name)?.focus();
        return;
      }
    }
  }
}
