import { ApiError } from '../../../core/api/api-error';
import { fieldMessage, resolveError } from './messages';

describe('fieldMessage', () => {
  it('prefers a field-specific message over the generic code message', () => {
    expect(fieldMessage({ field: 'password', code: 'REQUIRED' })).toBe(
      'Passwords must be at least 12 characters.',
    );
  });

  it('falls back to the code message when no field-specific override exists', () => {
    expect(fieldMessage({ field: 'firstName', code: 'REQUIRED' })).toBe('This field is required.');
  });

  it('falls back to a generic message for an unrecognized field and code', () => {
    expect(fieldMessage({ field: 'somethingNew', code: 'SOMETHING_NEW' })).toBe(
      'Please check this field.',
    );
  });
});

describe('resolveError', () => {
  it('maps INVALID_CREDENTIALS to a form-level message, never field-level', () => {
    const resolved = resolveError(new ApiError(401, 'INVALID_CREDENTIALS', 'Bad credentials.'));
    expect(resolved).toEqual({
      shape: 'form',
      message: 'That email or password is incorrect.',
      field: undefined,
      traceId: undefined,
      retryAfterSeconds: undefined,
    });
  });

  it('maps EMAIL_ALREADY_REGISTERED to a field-level message on email', () => {
    const resolved = resolveError(
      new ApiError(409, 'EMAIL_ALREADY_REGISTERED', 'Already registered.'),
    );
    expect(resolved.shape).toBe('field');
    expect(resolved.field).toBe('email');
  });

  it('carries the Retry-After seconds through for RATE_LIMITED', () => {
    const resolved = resolveError(
      new ApiError(429, 'RATE_LIMITED', 'Too many.', undefined, undefined, 42),
    );
    expect(resolved.retryAfterSeconds).toBe(42);
  });

  it('picks the NOT_FOUND wording by context', () => {
    const resolved = resolveError(new ApiError(404, 'NOT_FOUND', 'No such property.'), 'property');
    expect(resolved.message).toBe("We couldn't find that hotel.");
  });

  it('falls back by status class for an unmapped code, without throwing', () => {
    const resolved = resolveError(new ApiError(418, 'IM_A_TEAPOT', 'Nope.'));
    expect(resolved.shape).toBe('form');
    expect(resolved.message).toBe(
      "We couldn't complete that request. Please check your entry and try again.",
    );
  });

  it('treats a non-ApiError as a generic page-level failure', () => {
    expect(resolveError(new Error('boom'))).toEqual({
      shape: 'page',
      message: 'Something went wrong. Please try again.',
    });
  });
});
