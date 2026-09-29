import { formatMoney } from './format';

/**
 * S8c's change-dates confirmation, per ui-specifications.md: "Your new total is $837.00 (was
 * $672.30)." only when the re-priced total actually differs -- otherwise just the confirmation,
 * with no comparison line. Ported from the React client's lib/reservationChangeSummary.ts.
 */
export function totalAmountChangeMessage(
  oldTotal: string,
  newTotal: string,
  currency: string,
): string | null {
  if (oldTotal === newTotal) return null;
  return `Your new total is ${formatMoney(newTotal, currency)} (was ${formatMoney(oldTotal, currency)}).`;
}
