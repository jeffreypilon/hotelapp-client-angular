/**
 * Client-side pre-validation, per ui-specifications.md S3 and error-handling.md's field-code
 * table -- wording matches what the server would say exactly. Only runs once both dates are
 * present; an empty date is not an error, it's just nothing to validate yet (S2's form has no
 * `required` on its inputs).
 */

export interface DateValidationErrors {
  checkInDate?: string;
  checkOutDate?: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_STAY_NIGHTS = 30;

function toUtcDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function todayUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function validateDateRange(checkInDate: string, checkOutDate: string): DateValidationErrors {
  const errors: DateValidationErrors = {};

  if (toUtcDate(checkInDate).getTime() < todayUtcDate().getTime()) {
    errors.checkInDate = "Please choose a date that isn't in the past.";
    return errors;
  }

  const nights = Math.round(
    (toUtcDate(checkOutDate).getTime() - toUtcDate(checkInDate).getTime()) / MS_PER_DAY,
  );

  if (nights <= 0) {
    errors.checkOutDate = 'Check-out must be after check-in.';
    return errors;
  }

  if (nights > MAX_STAY_NIGHTS) {
    errors.checkOutDate = 'Stays can be at most 30 nights.';
  }

  return errors;
}
