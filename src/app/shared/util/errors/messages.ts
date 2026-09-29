import { ApiError, type FieldError } from '../../../core/api/api-error';

/**
 * Section 2's table as data, per error-handling.md#5-angular-implementation -- the only place an
 * ApiError becomes user-facing text. Wording is byte-identical to the React client's copy of this
 * table (lib/errors/messages.ts).
 */
export type ErrorShape = 'field' | 'form' | 'page';

export interface ErrorMapEntry {
  shape: ErrorShape;
  message: string;
  field?: string;
}

export interface ResolvedError {
  shape: ErrorShape;
  message: string;
  field?: string;
  traceId?: string;
  retryAfterSeconds?: number;
}

export type NotFoundContext = 'property' | 'roomType' | 'reservation' | 'route' | 'generic';

const notFoundMessages: Record<NotFoundContext, string> = {
  property: "We couldn't find that hotel.",
  roomType: "We couldn't find that room.",
  reservation: "We couldn't find that reservation.",
  route: "We couldn't find that page.",
  generic: "We couldn't find what you were looking for.",
};

export const ERROR_MESSAGES: Record<string, ErrorMapEntry> = {
  INVALID_CREDENTIALS: { shape: 'form', message: 'That email or password is incorrect.' },
  PAYMENT_DECLINED: {
    shape: 'field',
    message: 'This card was declined. Please try another card.',
    field: 'cardNumber',
  },
  ACCOUNT_INACTIVE: {
    shape: 'form',
    message: 'This account has been deactivated. Please contact the property for help.',
  },
  INSUFFICIENT_ROLE: { shape: 'page', message: "You don't have permission to view this page." },
  PROPERTY_OUT_OF_SCOPE: {
    shape: 'page',
    message: "You don't have access to that hotel's information.",
  },
  EMAIL_ALREADY_REGISTERED: {
    shape: 'field',
    message: 'An account with this email already exists.',
    field: 'email',
  },
  ROOM_NUMBER_IN_USE: {
    shape: 'field',
    message: 'That room number already exists at this hotel.',
    field: 'roomNumber',
  },
  SLUG_IN_USE: { shape: 'field', message: 'That URL slug is already in use.', field: 'slug' },
  ROOM_UNAVAILABLE: {
    shape: 'form',
    message: 'Those dates are no longer available. Someone else may have booked the last room.',
  },
  CANCELLATION_WINDOW_CLOSED: {
    shape: 'form',
    message: 'Changes are no longer available for this reservation.',
  },
  INVALID_STATUS_TRANSITION: {
    shape: 'form',
    message: "This reservation has changed. We've refreshed it — please try again.",
  },
  RATE_LIMITED: { shape: 'form', message: 'Too many attempts. Please try again in a few minutes.' },
  INTERNAL_ERROR: { shape: 'form', message: 'Something went wrong on our end. Please try again.' },
  NETWORK_ERROR: {
    shape: 'page',
    message: "We couldn't reach the server. Please check your connection and try again.",
  },
};

const fieldCodeMessages: Record<string, string> = {
  REQUIRED: 'This field is required.',
  AFTER_CHECK_IN: 'Check-out must be after check-in.',
  PAST_DATE: "Please choose a date that isn't in the past.",
  MAX_STAY: 'Stays can be at most 30 nights.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_FORMAT: 'Please check the format of this entry.',
  OUT_OF_RANGE: 'Please enter a value within the allowed range.',
};

const fieldSpecificMessages: Record<string, string> = {
  password: 'Passwords must be at least 12 characters.',
  numGuests: 'At least one guest is required.',
  pageSize: 'Choose a page size of 100 or fewer.',
  discountPercent: 'Enter a discount between 0 and 100.',
  baseRate: 'Enter a nightly rate greater than $0.00.',
  cardNumber: 'Please check the card number.',
  expiryMonth: 'Please enter a valid expiry date.',
  expiryYear: 'Please enter a valid expiry date.',
  cvv: 'Please enter the 3- or 4-digit security code.',
  timezone: 'Please choose a valid time zone.',
};

/** Per-field text for a VALIDATION_FAILED errors[] entry -- never the server's own errors[].message. */
export function fieldMessage(fieldError: Pick<FieldError, 'field' | 'code'>): string {
  return (
    fieldSpecificMessages[fieldError.field] ??
    fieldCodeMessages[fieldError.code] ??
    'Please check this field.'
  );
}

function fallbackByStatus(status: number): string {
  if (status >= 500) return 'Something went wrong on our end. Please try again.';
  if (status >= 400)
    return "We couldn't complete that request. Please check your entry and try again.";
  return 'Something went wrong. Please try again.';
}

/**
 * The only place an ApiError becomes user-facing text. Unknown codes fall back by status class
 * rather than crashing -- a new code is a non-breaking backend change per versioning-strategy.md.
 */
export function resolveError(err: unknown, context: NotFoundContext = 'generic'): ResolvedError {
  if (!(err instanceof ApiError)) {
    return { shape: 'page', message: 'Something went wrong. Please try again.' };
  }

  if (err.code === 'NOT_FOUND') {
    return { shape: 'page', message: notFoundMessages[context] };
  }

  if (err.code === 'VALIDATION_FAILED') {
    return { shape: 'field', message: 'Please check the highlighted fields and try again.' };
  }

  const entry = ERROR_MESSAGES[err.code];
  if (entry) {
    return {
      shape: entry.shape,
      message: entry.message,
      field: entry.field,
      traceId: err.code === 'INTERNAL_ERROR' ? err.traceId : undefined,
      retryAfterSeconds: err.code === 'RATE_LIMITED' ? err.retryAfterSeconds : undefined,
    };
  }

  // The backend added a code this client doesn't know about yet -- a legal, non-breaking change
  // per versioning-strategy.md, but the signal this client needs updating.
  console.warn('[warn] unmapped ApiError code', { code: err.code, status: err.status });
  return { shape: 'form', message: fallbackByStatus(err.status) };
}
