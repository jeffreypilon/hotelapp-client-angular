import { reservationTabParams, todayDateString, isReservationTab } from './reservation-tabs';

describe('reservationTabParams', () => {
  it('upcoming filters from today', () => {
    expect(reservationTabParams('upcoming', '2026-09-29')).toEqual({ from: '2026-09-29' });
  });

  it('past filters to today', () => {
    expect(reservationTabParams('past', '2026-09-29')).toEqual({ to: '2026-09-29' });
  });

  it('cancelled filters by status', () => {
    expect(reservationTabParams('cancelled', '2026-09-29')).toEqual({ status: ['CANCELLED'] });
  });

  it('all has no filter', () => {
    expect(reservationTabParams('all', '2026-09-29')).toEqual({});
  });
});

describe('todayDateString', () => {
  it('returns the local calendar date as YYYY-MM-DD', () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('isReservationTab', () => {
  it('accepts each of the four valid tabs', () => {
    expect(isReservationTab('upcoming')).toBe(true);
    expect(isReservationTab('past')).toBe(true);
    expect(isReservationTab('cancelled')).toBe(true);
    expect(isReservationTab('all')).toBe(true);
  });

  it('rejects an unknown value and null', () => {
    expect(isReservationTab('bogus')).toBe(false);
    expect(isReservationTab(null)).toBe(false);
  });
});
