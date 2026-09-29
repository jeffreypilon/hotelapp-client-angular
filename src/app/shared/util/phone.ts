/**
 * The one place a phone number is formatted for display, mirroring lib/format.ts's "one shared
 * formatter" convention. US area-code-and-hyphen mask: "(000) 000-0000".
 */
export function formatPhoneNumber(value: string): string {
  const raw = value.replace(/\D/g, '');
  // An 11-digit value starting with "1" carries a US country code (e.g. "+1-207-555-0100") --
  // strip the "1", not the last digit a bare slice(0, 10) would drop.
  const digits = (raw.length === 11 && raw[0] === '1' ? raw.slice(1) : raw).slice(0, 10);

  if (digits.length === 0) return '';
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** True once formatPhoneNumber has produced a complete 10-digit number, not a partial one. */
export function isCompletePhoneNumber(value: string): boolean {
  return value.replace(/\D/g, '').length === 10;
}
