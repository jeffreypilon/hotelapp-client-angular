import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { ReactiveFormsModule, type FormControl } from '@angular/forms';

/**
 * Shared by S5's two forms: show/hide toggle, and an up-front length hint -- never a strength
 * meter. Presentational (injects nothing, per coding-standards.md) -- takes the FormControl
 * directly rather than a `formControlName`, so it composes with either parent form's group.
 */
@Component({
  selector: 'app-password-field',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password-field.html',
})
export class PasswordField {
  readonly control = input.required<FormControl<string>>();
  readonly controlId = input.required<string>();
  readonly label = input.required<string>();
  readonly autoComplete = input.required<'current-password' | 'new-password'>();
  readonly hint = input<string>();
  /** Omitted for a field verifying an EXISTING credential (login's password) -- the client can't
   * know what rule was in effect when that value was set, so it gets no length cap. */
  readonly maxLength = input<number>();
  readonly error = input<string | null>(null);

  protected readonly visible = signal(false);

  protected toggleVisible(): void {
    this.visible.update((v) => !v);
  }
}
