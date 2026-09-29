import { describe, expect, it } from 'vitest';
import { digitsOnly } from './digits-only';

describe('digitsOnly', () => {
  it('strips non-digit characters', () => {
    expect(digitsOnly('12/26', 4)).toBe('1226');
  });

  it('caps at maxLength', () => {
    expect(digitsOnly('123456', 4)).toBe('1234');
  });
});
