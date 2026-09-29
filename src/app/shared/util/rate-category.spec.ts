import { rateCategoryLabel } from './rate-category';
import { describe, expect, it } from 'vitest';

describe('rateCategoryLabel', () => {
  const options = [
    { value: 'AAA_CAA', label: 'AAA/CAA' },
    { value: 'MILITARY_VETERAN', label: 'Military/Veteran' },
  ];

  it('looks up the label for a known value', () => {
    expect(rateCategoryLabel(options, 'AAA_CAA')).toBe('AAA/CAA');
  });

  it('falls back to the raw value for an unknown value, never the enum spelled differently', () => {
    expect(rateCategoryLabel(options, 'NONE')).toBe('NONE');
  });
});
