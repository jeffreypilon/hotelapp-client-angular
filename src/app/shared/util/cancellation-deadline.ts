/**
 * Client-side mirror of data-model.md's cancellation-policy formula, needed because S4/S6 render
 * before a reservation exists -- there is no `cancellation.deadline` from the API yet to display.
 * `check_in_date AT TIME ZONE property.timezone - INTERVAL '48 hours'`, per
 * data-model.md#cancellation-policy. Ported from the React client's lib/cancellationDeadline.ts
 * verbatim, not reinterpreted, so all three implementations (Spring Boot, Node, this one) agree to
 * the second -- a reinterpretation is exactly how three independently-defensible answers diverge.
 *
 * No date library is used (dependency-policy.md) -- `timeZoneName: "longOffset"` gives the exact
 * UTC offset for the target IANA zone at a given instant, DST included, from `Intl` alone.
 */
export function cancellationDeadline(checkInDate: string, timezone: string): string {
  const [year, month, day] = checkInDate.split('-').map(Number);
  const midnightAsUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0);

  const offsetPart = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'longOffset',
    timeZone: timezone,
  })
    .formatToParts(new Date(midnightAsUtcMs))
    .find((part) => part.type === 'timeZoneName')?.value;

  const match = offsetPart?.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offsetMinutes = match
    ? (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]))
    : 0;

  const checkInMidnightUtcMs = midnightAsUtcMs - offsetMinutes * 60_000;
  const deadlineMs = checkInMidnightUtcMs - 48 * 60 * 60 * 1000;
  return new Date(deadlineMs).toISOString();
}
