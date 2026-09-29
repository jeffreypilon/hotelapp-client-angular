import { validateDateRange } from './date-validation';
import { describe, expect, it } from 'vitest';

/** Baseline "today" every test picks a date safely after, so the suite never goes flaky at midnight. */
const FAR_FUTURE_CHECK_IN = '2099-06-01';

describe('validateDateRange', () => {
  it('is valid for an ordinary future stay', () => {
    expect(validateDateRange(FAR_FUTURE_CHECK_IN, '2099-06-05')).toEqual({});
  });

  it('rejects a check-in date in the past', () => {
    expect(validateDateRange('2000-01-01', '2000-01-05')).toEqual({
      checkInDate: "Please choose a date that isn't in the past.",
    });
  });

  it('rejects a check-out date on or before check-in', () => {
    expect(validateDateRange(FAR_FUTURE_CHECK_IN, FAR_FUTURE_CHECK_IN)).toEqual({
      checkOutDate: 'Check-out must be after check-in.',
    });
    expect(validateDateRange(FAR_FUTURE_CHECK_IN, '2099-05-30')).toEqual({
      checkOutDate: 'Check-out must be after check-in.',
    });
  });

  it('rejects a stay longer than 30 nights', () => {
    expect(validateDateRange(FAR_FUTURE_CHECK_IN, '2099-07-15')).toEqual({
      checkOutDate: 'Stays can be at most 30 nights.',
    });
  });

  it('accepts a stay of exactly 30 nights', () => {
    expect(validateDateRange(FAR_FUTURE_CHECK_IN, '2099-07-01')).toEqual({});
  });
});
