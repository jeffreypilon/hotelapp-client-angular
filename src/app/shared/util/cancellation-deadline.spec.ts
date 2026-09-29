import { describe, expect, it } from 'vitest';
import { cancellationDeadline } from './cancellation-deadline';

/**
 * These three cases are acceptance-criteria.md's own worked examples (AC-CX-04, AC-CX-05), not
 * invented -- the point is to pin this function against the same numbers the backends are held
 * to, not just check it against itself. Same three cases the React client pinned in Step 5.
 */
describe('cancellationDeadline', () => {
  it('computes the baseline example: America/New_York, check-in 2026-11-14', () => {
    expect(cancellationDeadline('2026-11-14', 'America/New_York')).toBe('2026-11-12T05:00:00.000Z');
  });

  it("respects the property's timezone, not the server's -- America/Los_Angeles", () => {
    expect(cancellationDeadline('2026-11-14', 'America/Los_Angeles')).toBe(
      '2026-11-12T08:00:00.000Z',
    );
  });

  it('AC-CX-05: a DST transition does not shift the deadline -- fixed 48h duration, not two calendar days', () => {
    // Check-in is the day after the 2026 US spring-forward (2026-03-08). The correct deadline is
    // exactly 48 hours before the check-in instant: 2026-03-07T04:00:00Z. The wrong answer this
    // guards against is 2026-03-07T05:00:00Z, produced by subtracting two calendar days from the
    // date and re-localizing midnight instead of subtracting a fixed duration from the instant.
    expect(cancellationDeadline('2026-03-09', 'America/New_York')).toBe('2026-03-07T04:00:00.000Z');
  });
});
