import { isCompletePhoneNumber } from './phone';

describe('isCompletePhoneNumber', () => {
  it('is true for exactly 10 digits', () => {
    expect(isCompletePhoneNumber('2035550100')).toBe(true);
    expect(isCompletePhoneNumber('(203) 555-0100')).toBe(true);
  });

  it('is false for a partial number', () => {
    expect(isCompletePhoneNumber('(203) 555-01')).toBe(false);
  });

  it('is false for an empty value', () => {
    expect(isCompletePhoneNumber('')).toBe(false);
  });
});
