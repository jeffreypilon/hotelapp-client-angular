/**
 * The only place money, dates, and timestamps are formatted, per architecture-specification.md.
 * Money stays a decimal string everywhere else in this client; converting it to a number here is
 * the one sanctioned exception, for display only -- never for arithmetic.
 */
export function formatMoney(amount: string, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount));
}

/**
 * dateString is a calendar date (YYYY-MM-DD, no time). Parsed as UTC so it never shifts a day.
 * "full" per ui-specifications.md §1: "Sat, Nov 14, 2026". "dense" for compact tables: "Nov 14".
 */
export function formatDate(dateString: string, variant: 'full' | 'dense' = 'full'): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const options: Intl.DateTimeFormatOptions =
    variant === 'full'
      ? { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
      : { month: 'short', day: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat('en-US', options).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * timestamp is an ISO 8601 instant; timeZone renders it in the property's zone, not the browser's.
 * timeZoneName is required so the cancellation deadline -- "the only timestamp that represents a
 * real moment" per ui-specifications.md -- can show its zone abbreviation (e.g. "EST"). dateStyle/
 * timeStyle can't be combined with timeZoneName, so every component is spelled out explicitly (a
 * real Intl API limitation, confirmed by the React client's Step 5, not a style choice).
 */
export function formatTimestamp(timestamp: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone,
  }).format(new Date(timestamp));
}
