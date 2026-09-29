import { formatDate, formatMoney, formatTimestamp } from './format';
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

describe('formatDate', () => {
  it('renders the full variant with weekday, per ui-specifications.md §1', () => {
    expect(formatDate('2026-11-14')).toBe('Sat, Nov 14, 2026');
  });

  it('renders the dense variant for compact tables', () => {
    expect(formatDate('2026-11-14', 'dense')).toBe('Nov 14');
  });

  it('never shifts a day regardless of the host timezone -- parsed as UTC', () => {
    expect(formatDate('2026-01-01')).toBe('Thu, Jan 1, 2026');
  });
});

describe('formatTimestamp', () => {
  it('renders the instant in the property timezone with a zone abbreviation', () => {
    expect(formatTimestamp('2026-11-12T05:00:00.000Z', 'America/New_York')).toBe(
      'Nov 12, 2026, 12:00 AM EST',
    );
  });

  it('renders the same instant differently in a different timezone', () => {
    expect(formatTimestamp('2026-11-12T05:00:00.000Z', 'America/Los_Angeles')).toBe(
      'Nov 11, 2026, 9:00 PM PST',
    );
  });
});
