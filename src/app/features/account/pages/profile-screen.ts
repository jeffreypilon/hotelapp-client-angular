import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../core/api/api-error';
import { ProfileStore } from '../profile.store';
import { fieldMessage, resolveError } from '../../../shared/util/errors/messages';
import { formatPhoneNumber, isCompletePhoneNumber } from '../../../shared/util/phone';
import {
  buildProfilePatch,
  type ProfileDirtyFields,
  type ProfileFormValues,
} from '../../../shared/util/build-profile-patch';
import type { Profile } from '../../../core/api/types';

/**
 * S8a -- profile, per ui-specifications.md. `email` never appears in the form: it's read-only
 * plain text with "Email cannot be changed." helper text, avoiding the disabled-field a11y
 * ambiguity a disabled input would raise. The hard part is the PATCH body -- see
 * shared/util/build-profile-patch.ts.
 */
@Component({
  selector: 'app-profile-screen',
  imports: [ReactiveFormsModule, RouterLink],
  providers: [ProfileStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-screen.html',
})
export class ProfileScreen {
  protected readonly store = inject(ProfileStore);
  protected readonly resolveError = resolveError;
  protected readonly formatPhoneNumber = formatPhoneNumber;

  protected readonly editing = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly submitting = signal(false);

  protected readonly form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    phone: new FormControl('', {
      nonNullable: true,
      validators: [
        (control) =>
          !control.value || isCompletePhoneNumber(control.value) ? null : { phoneIncomplete: true },
      ],
    }),
    address: new FormGroup({
      line1: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
      line2: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(200)] }),
      city: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
      stateProvince: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(120)],
      }),
      postalCode: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(20)],
      }),
      countryCode: new FormControl('', {
        nonNullable: true,
        validators: [
          (control) =>
            !control.value || control.value.length === 2 ? null : { countryCode: true },
        ],
      }),
    }),
  });

  constructor() {
    this.store.loadProfile();

    // Reformat the phone field live as the guest types, same mask used at registration -- see
    // register-screen.ts's identical constructor comment for why this goes through valueChanges
    // rather than a second native (input) listener.
    this.form.controls.phone.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const formatted = formatPhoneNumber(value);
      if (formatted !== value) this.form.controls.phone.setValue(formatted, { emitEvent: false });
    });

    effect(() => {
      const profile = this.store.profile();
      if (profile && !this.editing()) this.resetForm(profile);
    });
  }

  private resetForm(profile: Profile): void {
    this.form.reset({
      firstName: profile.firstName,
      lastName: profile.lastName,
      // Reformatted on load, not just trusted as-is -- existing data may predate this mask.
      phone: formatPhoneNumber(profile.phone ?? ''),
      address: {
        line1: profile.address?.line1 ?? '',
        line2: profile.address?.line2 ?? '',
        city: profile.address?.city ?? '',
        stateProvince: profile.address?.stateProvince ?? '',
        postalCode: profile.address?.postalCode ?? '',
        countryCode: profile.address?.countryCode ?? '',
      },
    });
  }

  protected hasAnyAddressField(profile: Profile): boolean {
    return !!(
      profile.address?.line1 ||
      profile.address?.city ||
      profile.address?.stateProvince ||
      profile.address?.postalCode ||
      profile.address?.countryCode
    );
  }

  protected startEditing(): void {
    this.formError.set(null);
    this.successMessage.set(null);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    const profile = this.store.profile();
    if (profile) this.resetForm(profile);
    this.formError.set(null);
    this.editing.set(false);
  }

  protected firstNameError(): string | null {
    return this.requiredOrMaxLengthError('firstName');
  }

  protected lastNameError(): string | null {
    return this.requiredOrMaxLengthError('lastName');
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

  protected countryCodeError(): string | null {
    const control = this.form.controls.address.controls.countryCode;
    const serverError = control.errors?.['server'] as string | undefined;
    if (serverError) return serverError;
    if (!control.touched || control.valid) return null;
    if (control.errors?.['countryCode']) return 'Enter a 2-letter country code, e.g. US.';
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

  private dirtyFields(): ProfileDirtyFields {
    const { controls } = this.form;
    const address = controls.address.controls;
    const dirtyAddress: ProfileDirtyFields['address'] = {};
    for (const key of Object.keys(address) as (keyof typeof address)[]) {
      if (address[key].dirty) dirtyAddress[key] = true;
    }
    return {
      firstName: controls.firstName.dirty,
      lastName: controls.lastName.dirty,
      phone: controls.phone.dirty,
      address: Object.keys(dirtyAddress).length > 0 ? dirtyAddress : undefined,
    };
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
      const values = this.form.getRawValue() as ProfileFormValues;
      const patch = buildProfilePatch(this.dirtyFields(), values);
      await this.store.patchProfile(patch);
      this.successMessage.set('Your profile has been updated.');
      this.editing.set(false);
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
    if (err.code === 'VALIDATION_FAILED' && err.errors && err.errors.length > 0) {
      for (const fe of err.errors) {
        this.form.get(fe.field)?.setErrors({ server: fieldMessage(fe) });
      }
      return;
    }
    const resolved = resolveError(err);
    if (resolved.shape === 'field' && resolved.field) {
      const control = this.form.get(resolved.field);
      if (control) {
        control.setErrors({ server: resolved.message });
        return;
      }
    }
    this.formError.set(resolved.message);
  }
}
