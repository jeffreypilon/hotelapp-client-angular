import { formatMoney } from './format';
import { describe, expect, it } from 'vitest';

describe('formatMoney', () => {
  it('renders a whole-dollar amount with two decimal places and a thousands separator', () => {
    expect(formatMoney('224.10')).toBe('$224.10');
    expect(formatMoney('1234.50')).toBe('$1,234.50');
    expect(formatMoney('0.00')).toBe('$0.00');
  });

  it('pads a single decimal place', () => {
    expect(formatMoney('672.3')).toBe('$672.30');
  });
});
