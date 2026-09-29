import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ApiError } from '../../../core/api/api-error';
import { ProfileStore } from '../profile.store';
import { fieldMessage, resolveError } from '../../../shared/util/errors/messages';
import { PasswordField } from '../../auth/components/password-field';

const passwordsMatch: ValidatorFn = (group) => {
  const password = group.get('newPassword')?.value;
  const confirm = group.get('confirmNewPassword')?.value;
  return password === confirm ? null : { mismatch: true };
};

/**
 * S8d -- password change, per ui-specifications.md. Deliberately does not invalidate the session
 * or route to login on success -- the contract is explicit the caller stays logged in, the
 * opposite of every other place this app sees a 401-shaped code. `INVALID_CREDENTIALS` here means
 * "wrong current password" and is field-level, unlike the shared error map's form-level wording
 * for the same code on the login screen.
 */
@Component({
  selector: 'app-password-screen',
  imports: [ReactiveFormsModule, PasswordField],
  providers: [ProfileStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password-screen.html',
})
export class PasswordScreen {
  private readonly store = inject(ProfileStore);

  protected readonly formError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = new FormGroup(
    {
      currentPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      // 12-24: the 12-char floor is a deliberate policy (security-principles.md#passwords); 24 is
      // a UX ceiling only, comfortably under bcrypt's 72-byte truncation point.
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(12), Validators.maxLength(24)],
      }),
      confirmNewPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(24)],
      }),
    },
    { validators: [passwordsMatch] },
  );

  protected currentPasswordError(): string | null {
    const control = this.form.controls.currentPassword;
    const serverError = control.errors?.['server'] as string | undefined;
    if (serverError) return serverError;
    if (!control.touched || control.valid) return null;
    if (control.errors?.['required']) return 'This field is required.';
    return 'Please check this field.';
  }

  protected newPasswordError(): string | null {
    const control = this.form.controls.newPassword;
    const serverError = control.errors?.['server'] as string | undefined;
    if (serverError) return serverError;
    if (!control.touched || control.valid) return null;
    if (control.errors?.['required']) return 'This field is required.';
    if (control.errors?.['minlength']) return 'Passwords must be at least 12 characters.';
    if (control.errors?.['maxlength']) return 'Passwords must be at most 24 characters.';
    return 'Please check this field.';
  }

  protected confirmNewPasswordError(): string | null {
    const control = this.form.controls.confirmNewPassword;
    if (!control.touched) return null;
    if (control.errors?.['required']) return 'This field is required.';
    if (control.errors?.['maxlength']) return 'Passwords must be at most 24 characters.';
    if (this.form.errors?.['mismatch'] && control.value) return 'Passwords do not match.';
    return null;
  }

  protected async onSubmit(): Promise<void> {
    this.formError.set(null);
    this.successMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    try {
      const { currentPassword, newPassword } = this.form.getRawValue();
      await this.store.changePassword({ currentPassword, newPassword });
      this.successMessage.set(
        "Your password has been updated. You've been signed out on your other devices.",
      );
      this.form.reset({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    } catch (err) {
      this.handleError(err);
    } finally {
      this.submitting.set(false);
    }
  }

  private handleError(err: unknown): void {
    if (!(err instanceof ApiError)) {
      this.formError.set(
        "We couldn't reach the server. Please check your connection and try again.",
      );
      return;
    }
    if (err.code === 'INVALID_CREDENTIALS') {
      this.form.controls.currentPassword.setErrors({ server: 'That password is incorrect.' });
      return;
    }
    if (err.code === 'VALIDATION_FAILED' && err.errors && err.errors.length > 0) {
      for (const fe of err.errors) {
        this.form.get(fe.field)?.setErrors({ server: fieldMessage(fe) });
      }
      return;
    }
    const resolved = resolveError(err);
    this.formError.set(resolved.message);
  }
}
