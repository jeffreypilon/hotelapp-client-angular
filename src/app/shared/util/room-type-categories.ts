/** The `room_type_code` enum from data-model.md -- shared by any screen labeling a room-type category. */
export const ROOM_TYPE_CATEGORY_LABELS: Record<string, string> = {
  SINGLE: 'Single',
  DOUBLE: 'Double',
  KING: 'King',
  SUITE: 'Suite',
  CONFERENCE_ROOM: 'Conference Room',
};

export function roomTypeCategoryLabel(code: string): string {
  return ROOM_TYPE_CATEGORY_LABELS[code] ?? code;
}

/**
 * "Sleeps"/"night" describe an overnight stay; a Conference Room is booked by the full day like
 * any other room type but isn't one (domain-glossary.md#room-type), so those words are wrong for
 * it. Per ui-specifications.md's S2 entry: only the occupancy label and the per-unit rate label
 * change for this category -- the underlying `nights` duration count is unchanged.
 */
export function occupancyLabel(code: string, maxOccupancy: number): string {
  return code === 'CONFERENCE_ROOM' ? `Capacity ${maxOccupancy}` : `Sleeps ${maxOccupancy}`;
}

export function rateUnit(code: string): 'night' | 'day' {
  return code === 'CONFERENCE_ROOM' ? 'day' : 'night';
}
