import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, CanDeactivateFn, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { BookingStore } from '../booking.store';
import { ReferenceDataStore } from '../../../core/reference-data/reference-data.store';
import { ReservationsApi } from '../../../core/api/reservations.api';
import { ApiError } from '../../../core/api/api-error';
import { BookingSummaryCard } from '../components/booking-summary-card';
import { resolveError, fieldMessage } from '../../../shared/util/errors/messages';
import { cancellationDeadline } from '../../../shared/util/cancellation-deadline';
import { rateCategoryLabel } from '../../../shared/util/rate-category';
import { formatCardNumber } from '../../../shared/util/card-number';
import { digitsOnly } from '../../../shared/util/digits-only';

const TEST_CARDS = [
  { number: '4242 4242 4242 4242', result: 'Succeeds (Visa)' },
  { number: 'Any number ending 0000', result: 'Declines' },
];

function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function cardNumberValidator(control: AbstractControl<string>): ValidationErrors | null {
  const digits = (control.value ?? '').replace(/\s+/g, '');
  if (!digits) return { required: true };
  return /^\d{13,19}$/.test(digits) && luhnValid(digits) ? null : { cardNumber: true };
}

function expiryMonthValidator(control: AbstractControl<string>): ValidationErrors | null {
  if (!control.value) return { required: true };
  const n = Number(control.value);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? null : { expiryInvalid: true };
}

const currentYear = new Date().getUTCFullYear();

function expiryYearValidator(control: AbstractControl<string>): ValidationErrors | null {
  if (!control.value) return { required: true };
  const n = Number(control.value);
  return Number.isInteger(n) && n >= currentYear && n <= currentYear + 20
    ? null
    : { expiryInvalid: true };
}

/** Cross-field: expiry must not be in the past. Attached to the group, not a single control. */
function expiryInFutureValidator(group: AbstractControl): ValidationErrors | null {
  const month = Number(group.get('expiryMonth')?.value);
  const year = Number(group.get('expiryYear')?.value);
  if (!month || !year) return null;
  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1;
  const inFuture = year > currentYear || (year === currentYear && month >= currentMonth);
  return inFuture ? null : { expired: true };
}

type PaymentFormGroup = FormGroup<{
  cardholderName: FormControl<string>;
  cardNumber: FormControl<string>;
  expiryMonth: FormControl<string>;
  expiryYear: FormControl<string>;
  cvv: FormControl<string>;
}>;

/**
 * S6 -- payment form, per ui-specifications.md. Re-derives the booking context itself (same
 * BookingStore as S4) rather than receiving pricing through navigation state, since a page reload
 * here must still work.
 */
@Component({
  selector: 'app-payment-screen',
  imports: [ReactiveFormsModule, RouterLink, BookingSummaryCard],
  providers: [BookingStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-screen.html',
})
export class PaymentScreen {
  readonly propertyId = input<string>();

  protected readonly store = inject(BookingStore);
  protected readonly referenceData = inject(ReferenceDataStore);
  protected readonly testCards = TEST_CARDS;
  protected readonly rateCategoryLabel = rateCategoryLabel;
  protected readonly cancellationDeadline = cancellationDeadline;
  protected readonly resolveError = resolveError;

  private readonly reservationsApi = inject(ReservationsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Created once per component instance, on construction (mount) -- never inside the submit
  // handler, which is exactly the bug this guards against: an inline crypto.randomUUID() per
  // attempt would let a double-click/retry-after-decline create two reservations instead of
  // safely retrying under one key. Stable across every submit attempt of this screen instance.
  private readonly idempotencyKey = crypto.randomUUID();

  protected readonly isSubmitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly roomUnavailable = signal(false);
  protected readonly roomNoLongerOffered = signal(false);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly roomTypeId = () => this.queryParamMap().get('roomTypeId') ?? '';
  protected readonly checkInDate = () => this.queryParamMap().get('checkInDate') ?? '';
  protected readonly checkOutDate = () => this.queryParamMap().get('checkOutDate') ?? '';
  protected readonly numGuests = () => {
    const parsed = Number(this.queryParamMap().get('numGuests') ?? '1');
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  };
  protected readonly rateCategory = () => this.queryParamMap().get('rateCategory') ?? 'NONE';
  protected readonly searchQueryParams = (): Record<string, string> => {
    const map = this.queryParamMap();
    return Object.fromEntries(map.keys.map((key) => [key, map.get(key) ?? '']));
  };

  protected readonly rateCategoryLabelText = () =>
    this.rateCategory() !== 'NONE'
      ? this.rateCategoryLabel(this.referenceData.rateCategories(), this.rateCategory())
      : null;

  protected readonly form: PaymentFormGroup = new FormGroup(
    {
      cardholderName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(100)],
      }),
      cardNumber: new FormControl('', { nonNullable: true, validators: [cardNumberValidator] }),
      expiryMonth: new FormControl('', { nonNullable: true, validators: [expiryMonthValidator] }),
      expiryYear: new FormControl('', { nonNullable: true, validators: [expiryYearValidator] }),
      cvv: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.pattern(/^\d{3,4}$/)],
      }),
    },
    { validators: expiryInFutureValidator },
  );

  constructor() {
    this.referenceData.loadOnce();
    effect(() => {
      const id = this.propertyId();
      if (!id) return;
      this.store.loadContext({
        propertyId: id,
        roomTypeId: this.roomTypeId(),
        checkInDate: this.checkInDate(),
        checkOutDate: this.checkOutDate(),
        numGuests: this.numGuests(),
        rateCategory: this.rateCategory(),
      });
    });

    // Live formatting, same pattern as register-screen's phone mask -- reformat through the
    // control's own valueChanges rather than a second native (input) listener.
    this.form.controls.cardNumber.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const formatted = formatCardNumber(value);
      if (formatted !== value)
        this.form.controls.cardNumber.setValue(formatted, { emitEvent: false });
    });
    this.form.controls.expiryMonth.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const digits = digitsOnly(value, 2);
      if (digits !== value) this.form.controls.expiryMonth.setValue(digits, { emitEvent: false });
    });
    this.form.controls.expiryYear.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const digits = digitsOnly(value, 4);
      if (digits !== value) this.form.controls.expiryYear.setValue(digits, { emitEvent: false });
    });
    this.form.controls.cvv.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const digits = digitsOnly(value, 4);
      if (digits !== value) this.form.controls.cvv.setValue(digits, { emitEvent: false });
    });

    // Angular's real, better-supported equivalent of React's useBlocker (incompatible with this
    // app's router there) is a CanDeactivateFn guard -- registered on the route in app.routes.ts,
    // it covers in-app navigation. beforeunload here covers what a guard structurally cannot:
    // tab-close, refresh, and external navigation. Per ui-specifications.md's S6 row, use both.
    effect((onCleanup) => {
      if (!this.isSubmitting()) return;
      const handler = (e: BeforeUnloadEvent) => e.preventDefault();
      window.addEventListener('beforeunload', handler);
      onCleanup(() => window.removeEventListener('beforeunload', handler));
    });
  }

  protected cardholderNameError(): string | null {
    const control = this.form.controls.cardholderName;
    if (!control.touched || control.valid) return null;
    if (control.errors?.['required']) return 'This field is required.';
    if (control.errors?.['maxlength']) return 'Please enter a shorter name.';
    return 'Please check this field.';
  }

  protected cardNumberError(): string | null {
    const control = this.form.controls.cardNumber;
    const serverError = control.errors?.['server'] as string | undefined;
    if (serverError) return serverError;
    if (!control.touched || control.valid) return null;
    return 'Please check the card number.';
  }

  protected expiryError(): string | null {
    const monthOrYearTouched =
      this.form.controls.expiryMonth.touched || this.form.controls.expiryYear.touched;
    if (!monthOrYearTouched) return null;
    const invalid =
      this.form.controls.expiryMonth.invalid ||
      this.form.controls.expiryYear.invalid ||
      !!this.form.errors?.['expired'];
    return invalid ? 'Please enter a valid expiry date.' : null;
  }

  protected cvvError(): string | null {
    const control = this.form.controls.cvv;
    if (!control.touched || control.valid) return null;
    if (control.errors?.['required']) return 'This field is required.';
    return 'Please enter the 3- or 4-digit security code.';
  }

  /** True once the "no-longer-offered/unavailable" states below should take over the whole screen. */
  protected showUnavailable(): boolean {
    return this.roomNoLongerOffered() || this.store.notAvailable() || !this.store.result();
  }

  protected async onSubmit(): Promise<void> {
    this.formError.set(null);
    this.roomUnavailable.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.isSubmitting.set(true);
    try {
      const values = this.form.getRawValue();
      const response = await firstValueFrom(
        this.reservationsApi.createReservation(
          {
            roomTypeId: this.roomTypeId(),
            checkInDate: this.checkInDate(),
            checkOutDate: this.checkOutDate(),
            numGuests: this.numGuests(),
            rateCategory: this.rateCategory(),
            payment: {
              cardholderName: values.cardholderName,
              cardNumber: values.cardNumber.replace(/\s+/g, ''),
              expiryMonth: Number(values.expiryMonth),
              expiryYear: Number(values.expiryYear),
              cvv: values.cvv,
            },
          },
          this.idempotencyKey,
        ),
      );
      // Passed via router state rather than a shared cache (this stack has no TanStack-Query-style
      // cache to pre-warm) -- ConfirmationScreen prefers this over its own fetch when present, and
      // falls back to a real GET on a direct load/share/reload. replaceUrl so Back can't resubmit.
      //
      // isSubmitting must be cleared BEFORE navigating, not just in the `finally` below: the
      // CanDeactivateFn guard on this very route reads isSubmitting() to decide whether to allow
      // leaving, and this navigation is the screen's own successful exit -- if it's still true
      // here, the guard blocks its own success path and the guest is stranded on this screen
      // despite a 201 already having been returned (confirmed live: two clicks each got a 201 for
      // the same reservation via the Idempotency-Key, but neither navigated until this was fixed).
      this.isSubmitting.set(false);
      await this.router.navigate(['/reservations', response.id, 'confirmation'], {
        replaceUrl: true,
        state: { reservation: response },
      });
    } catch (err) {
      this.handleError(err);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private handleError(err: unknown): void {
    this.formError.set(null);
    this.roomUnavailable.set(false);
    if (!(err instanceof ApiError)) {
      this.formError.set(
        "We couldn't reach the server. Please check your connection and try again.",
      );
      return;
    }
    if (err.code === 'ROOM_UNAVAILABLE') {
      this.formError.set(
        'Those dates are no longer available. Someone else may have booked the last room.',
      );
      this.roomUnavailable.set(true);
      return;
    }
    // Exact wording from ui-specifications.md's S6 table -- distinct from resolveError's generic
    // "We couldn't find that room.", and replaces the form rather than showing inline.
    if (err.code === 'NOT_FOUND') {
      this.roomNoLongerOffered.set(true);
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
  }

  private focusFirstInvalid(): void {
    for (const name of Object.keys(this.form.controls)) {
      if (this.form.get(name)?.invalid) {
        document.getElementById(name)?.focus();
        return;
      }
    }
  }

  /** CanDeactivateFn per ui-specifications.md's S6 row -- see app.routes.ts registration. */
  canDeactivate(): boolean {
    return !this.isSubmitting();
  }
}

export const paymentCanDeactivateGuard: CanDeactivateFn<PaymentScreen> = (component) =>
  component.canDeactivate();
