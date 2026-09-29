/**
 * The only place money is formatted, per architecture-specification.md. Money stays a decimal
 * string everywhere else in this client; converting it to a number here is the one sanctioned
 * exception, for display only -- never for arithmetic.
 */
export function formatMoney(amount: string, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount));
}
