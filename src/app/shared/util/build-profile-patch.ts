import type { PatchProfileRequest } from '../../core/api/types';

/** Form value shape for S8a's edit form -- `address` sub-fields are always strings, never null,
 * matching how a text input naturally represents "empty". */
export interface ProfileFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  address: {
    line1: string;
    line2: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    countryCode: string;
  };
}

/** Per-control dirty flags, mirroring react-hook-form's `dirtyFields` shape for the same form --
 * `address` only appears once at least one of its own sub-fields is dirty. */
export interface ProfileDirtyFields {
  firstName?: boolean;
  lastName?: boolean;
  phone?: boolean;
  address?: Partial<Record<keyof ProfileFormValues['address'], boolean>>;
}

function addressFromValues(values: ProfileFormValues): PatchProfileRequest['address'] {
  const { line1, line2, city, stateProvince, postalCode, countryCode } = values.address;
  return {
    line1,
    // Omitted, never `null`, when blank -- see PatchProfileRequest's doc comment in types.ts:
    // hotelapp-server-nodejs's schema rejects an explicit `null` for this one field specifically.
    ...(line2.trim() === '' ? {} : { line2 }),
    city,
    stateProvince,
    postalCode,
    countryCode,
  };
}

/**
 * PATCH /me treats an omitted field as unchanged and an explicit `null` as "clear it" -- `''` is
 * a third, wrong thing. Builds the request body from only the fields the guest actually touched,
 * per api-contracts.md and ui-specifications.md's S8a entry. `address` is all-or-nothing: any
 * dirty address field resends the whole current address object, since the contract describes
 * `address` as one top-level changeable field, not its sub-fields individually. Ported from the
 * React client's lib/buildProfilePatch.ts -- same cases, same pinned test values.
 */
export function buildProfilePatch(
  dirtyFields: ProfileDirtyFields,
  values: ProfileFormValues,
): PatchProfileRequest {
  const patch: PatchProfileRequest = {};

  if (dirtyFields.firstName) patch.firstName = values.firstName;
  if (dirtyFields.lastName) patch.lastName = values.lastName;
  if (dirtyFields.phone) patch.phone = values.phone.trim() === '' ? null : values.phone;

  if (dirtyFields.address && Object.keys(dirtyFields.address).length > 0) {
    patch.address = addressFromValues(values);
  }

  return patch;
}
