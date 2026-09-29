import { describe, expect, it } from 'vitest';
import {
  buildProfilePatch,
  type ProfileDirtyFields,
  type ProfileFormValues,
} from './build-profile-patch';

const values: ProfileFormValues = {
  firstName: 'Dana',
  lastName: 'Reyes',
  phone: '+1-555-0142',
  address: {
    line1: '44 Elm Street',
    line2: 'Apt 3',
    city: 'Portland',
    stateProvince: 'ME',
    postalCode: '04102',
    countryCode: 'US',
  },
};

describe('buildProfilePatch', () => {
  it('sends nothing when no field was touched', () => {
    expect(buildProfilePatch({}, values)).toEqual({});
  });

  it('sends only the touched top-level field', () => {
    const dirty: ProfileDirtyFields = { phone: true };
    expect(buildProfilePatch(dirty, values)).toEqual({ phone: '+1-555-0142' });
  });

  it('sends null, not an empty string, when a cleared phone was touched', () => {
    const dirty: ProfileDirtyFields = { phone: true };
    expect(buildProfilePatch(dirty, { ...values, phone: '' })).toEqual({ phone: null });
  });

  it('sends the whole address object when only one address field is dirty', () => {
    const dirty: ProfileDirtyFields = { address: { city: true } };
    expect(buildProfilePatch(dirty, values)).toEqual({
      address: {
        line1: '44 Elm Street',
        line2: 'Apt 3',
        city: 'Portland',
        stateProvince: 'ME',
        postalCode: '04102',
        countryCode: 'US',
      },
    });
  });

  it('omits address.line2 entirely, not null, when a cleared line2 was touched', () => {
    const dirty: ProfileDirtyFields = { address: { line2: true } };
    const result = buildProfilePatch(dirty, {
      ...values,
      address: { ...values.address, line2: '' },
    });
    expect(result.address).not.toHaveProperty('line2');
  });

  it('combines multiple touched fields in one patch', () => {
    const dirty: ProfileDirtyFields = { firstName: true, address: { postalCode: true } };
    const result = buildProfilePatch(dirty, values);
    expect(result).toEqual({
      firstName: 'Dana',
      address: {
        line1: '44 Elm Street',
        line2: 'Apt 3',
        city: 'Portland',
        stateProvince: 'ME',
        postalCode: '04102',
        countryCode: 'US',
      },
    });
  });
});
