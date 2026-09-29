import { totalAmountChangeMessage } from './reservation-change-summary';

describe('totalAmountChangeMessage', () => {
  it('returns null when the total is unchanged', () => {
    expect(totalAmountChangeMessage('672.30', '672.30', 'USD')).toBeNull();
  });

  it('states the new and old totals when the total changed', () => {
    expect(totalAmountChangeMessage('672.30', '837.00', 'USD')).toBe(
      'Your new total is $837.00 (was $672.30).',
    );
  });
});
