import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthApi } from '../../../core/api/auth.api';
import { ApiError } from '../../../core/api/api-error';
import { SessionStore } from '../../../core/session/session.store';
import { roleRank } from '../../../guards/role-rank';
import { fieldMessage, resolveError } from '../../../shared/util/errors/messages';
import { formatPhoneNumber, isCompletePhoneNumber } from '../../../shared/util/phone';
import { AuthLayout } from '../components/auth-layout';
import { PasswordField } from '../components/password-field';
import { createRetryCountdown } from '../util/retry-countdown';

function phoneValidator(control: AbstractControl<string>): ValidationErrors | null {
  if (!control.value) return null;
  return isCompletePhoneNumber(control.value) ? null : { phoneIncomplete: true };
}

/**
 * S5 registration, per ui-specifications.md. Registration logs the guest straight in and returns
 * the same body as login, so both paths finish identically.
 */
@Component({
  selector: 'app-register-screen',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, PasswordField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register-screen.html',
})
export class RegisterScreen {
  private readonly authApi = inject(AuthApi);
  private readonly session = inject(SessionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly retryCountdown = createRetryCountdown();

  protected readonly seconds = this.retryCountdown.seconds;
  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly emailTaken = signal(false);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });
  protected readonly next = () => this.queryParamMap().get('next');
  protected readonly loginQueryParams = () => (this.next() ? { next: this.next() } : {});

  protected readonly form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(320)],
    }),
    // 12-24: the 12-char floor is a deliberate policy (security-principles.md#passwords); 24 is a
    // UX ceiling only, comfortably under bcrypt's 72-byte truncation point.
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(12), Validators.maxLength(24)],
    }),
    phone: new FormControl('', { nonNullable: true, validators: [phoneValidator] }),
  });

  protected readonly disabled = () => this.isSubmitting() || this.seconds() > 0;

  constructor() {
    // Live area-code-and-hyphen mask, reformatting through the control's own valueChanges rather
    // than a second native `(input)` listener alongside formControlName's -- two listeners on one
    // native event race on write order under zoneless CD; routing the reformat through the forms
    // API itself keeps there being exactly one source of truth for the DOM value.
    this.form.controls.phone.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const formatted = formatPhoneNumber(value);
      if (formatted !== value) this.form.controls.phone.setValue(formatted, { emitEvent: false });
    });
  }

  protected firstNameError(): string | null {
    return this.requiredOrMaxLengthError('firstName');
  }

  protected lastNameError(): string | null {
    return this.requiredOrMaxLengthError('lastName');
  }

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
    if (control.errors?.['required']) return 'This field is required.';
    if (control.errors?.['minlength']) return 'Passwords must be at least 12 characters.';
    if (control.errors?.['maxlength']) return 'Passwords must be at most 24 characters.';
    return 'Please check this field.';
  }

  protected phoneError(): string | null {
    const control = this.form.controls.phone;
    const serverError = control.errors?.['server'] as string | undefined;
    if (serverError) return serverError;
    if (!control.touched || control.valid) return null;
    if (control.errors?.['phoneIncomplete']) {
      return 'Please enter a complete 10-digit phone number.';
    }
    return 'Please check this field.';
  }

  private requiredOrMaxLengthError(name: 'firstName' | 'lastName'): string | null {
    const control = this.form.controls[name];
    const serverError = control.errors?.['server'] as string | undefined;
    if (serverError) return serverError;
    if (!control.touched || control.valid) return null;
    if (control.errors?.['required']) return 'This field is required.';
    if (control.errors?.['maxlength']) return 'Please enter a shorter name.';
    return 'Please check this field.';
  }

  protected async onSubmit(): Promise<void> {
    this.formError.set(null);
    this.emailTaken.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.isSubmitting.set(true);
    try {
      const values = this.form.getRawValue();
      // Omit `phone` entirely when blank -- see core/api/types.ts's RegisterRequest doc comment.
      const { phone, ...rest } = values;
      const response = await firstValueFrom(
        this.authApi.register(phone ? { ...rest, phone } : rest),
      );
      this.session.setUser(response.user);
      const next = this.next();
      if (next) {
        await this.router.navigateByUrl(next);
        return;
      }
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
    this.emailTaken.set(false);
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
        if (err.code === 'EMAIL_ALREADY_REGISTERED') this.emailTaken.set(true);
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
