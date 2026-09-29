/**
 * S8b's four tabs, per ui-specifications.md -- all the same `GET /reservations` call with
 * different params. "Today" is the browser's local calendar date: a guest's reservations can span
 * properties with different timezones, so there's no single property timezone to anchor it to.
 * Ported from the React client's lib/reservationTabs.ts.
 */

export type ReservationTab = 'upcoming' | 'past' | 'cancelled' | 'all';

export const RESERVATION_TABS: ReservationTab[] = ['upcoming', 'past', 'cancelled', 'all'];

export const DEFAULT_RESERVATION_SORT = 'checkInDate:desc';

/** Local calendar date, not UTC -- matches the `date` (no time/offset) shape the API expects. */
export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ReservationListQueryParams {
  status?: string[];
  from?: string;
  to?: string;
}

export function reservationTabParams(
  tab: ReservationTab,
  today: string,
): ReservationListQueryParams {
  switch (tab) {
    case 'upcoming':
      return { from: today };
    case 'past':
      return { to: today };
    case 'cancelled':
      return { status: ['CANCELLED'] };
    case 'all':
      return {};
  }
}

export const reservationTabEmptyCopy: Record<ReservationTab, string> = {
  upcoming: 'You have no upcoming stays.',
  past: 'You have no past stays.',
  cancelled: 'You have no cancelled reservations.',
  all: 'You have no reservations.',
};

export function isReservationTab(value: string | null): value is ReservationTab {
  return RESERVATION_TABS.includes(value as ReservationTab);
}
