/**
 * Strips everything but digits and caps at maxLength -- for numeric-only fields with no visual
 * grouping (expiry month/year, CVV), unlike card-number.ts and phone.ts which also insert
 * separators. `inputmode="numeric"` alone only changes the mobile keyboard shown, it doesn't stop
 * a pasted or physically-typed letter. Ported from the React client's lib/digitsOnly.ts.
 */
export function digitsOnly(value: string, maxLength: number): string {
  return value.replace(/\D/g, '').slice(0, maxLength);
}
