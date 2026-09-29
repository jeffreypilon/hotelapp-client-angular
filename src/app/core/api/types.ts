/**
 * Hand-written from api-contracts.md, per architecture-specification.md -- not generated from
 * OpenAPI. Money is a decimal string end to end; this file only carries what's needed through
 * Step 1/2 so far.
 */

export type Role = 'GUEST' | 'FRONT_DESK_STAFF' | 'PROPERTY_MANAGER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  propertyId: string | null;
}

export interface Address {
  line1: string;
  line2: string | null;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string;
}

export interface PropertySummary {
  id: string;
  name: string;
  slug: string;
  description: string;
  photoUrl: string | null;
  address: Address;
  phone: string | null;
  timezone: string;
  roomTypeCount: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface PropertyListResponse {
  data: PropertySummary[];
  pagination: Pagination;
}

/**
 * GET /properties/{propertyId}'s embedded `roomTypes` -- confirmed flat against the live backend
 * by the React client's Step 2 (no description/amenities/photos), unlike the full RoomType shape
 * GET /properties/{propertyId}/room-types returns. Typed narrowly rather than assumed.
 */
export interface PropertyRoomTypeSummary {
  id: string;
  code: string;
  name: string;
  baseRate: string;
  currency: string;
  maxOccupancy: number;
  bedConfiguration: string;
  isAccessible: boolean;
}

export interface PropertyDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  photoUrl: string | null;
  address: Address;
  phone: string | null;
  timezone: string;
  roomTypeCount: number;
  roomTypes: PropertyRoomTypeSummary[];
}

export interface Amenity {
  code: string;
  name: string;
}

export interface Photo {
  id: string;
  url: string;
  caption: string;
  sortOrder: number;
  isPrimary: boolean;
}

/** The full shape GET /properties/{propertyId}/room-types and GET /room-types/{roomTypeId} return. */
export interface RoomType {
  id: string;
  propertyId: string;
  code: string;
  name: string;
  description: string;
  baseRate: string;
  currency: string;
  maxOccupancy: number;
  bedConfiguration: string;
  isAccessible: boolean;
  amenities: Amenity[];
  photos: Photo[];
}
