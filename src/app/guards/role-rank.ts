import type { Role } from '../core/api/types';

/**
 * Role is a string union with no inherent order, per architecture-specification.md --
 * staffGuard/managerGuard compare rank via this map, never set membership, so a new tier added
 * above Manager needs one edit here rather than a lookup at every call site.
 */
export const roleRank: Record<Role, number> = {
  GUEST: 0,
  FRONT_DESK_STAFF: 1,
  PROPERTY_MANAGER: 2,
};
