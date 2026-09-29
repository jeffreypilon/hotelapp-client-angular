/**
 * The one place a card number is formatted, matching shared/util/phone.ts's pattern for phone
 * numbers. Groups of four, space-separated ("4242 4242 4242 4242"), per ui-specifications.md's S6
 * entry. Capped at 16 digits -- every test card in that spec is 16 digits, and this demo doesn't
 * need to accommodate other card lengths (e.g. Amex's 15). Ported from the React client's
 * lib/cardNumber.ts.
 */
export function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.match(/.{1,4}/g)?.join(' ') ?? '';
}
