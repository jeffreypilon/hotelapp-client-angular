import { describe, expect, it } from 'vitest';
import { formatCardNumber } from './card-number';

describe('formatCardNumber', () => {
  it('groups digits in fours, space-separated', () => {
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
  });

  it('formats a partial number as typed, not just a complete one', () => {
    expect(formatCardNumber('42424242')).toBe('4242 4242');
  });

  it('strips non-digit characters and caps at 16 digits', () => {
    expect(formatCardNumber('4242-4242-4242-4242-9999')).toBe('4242 4242 4242 4242');
  });
});
