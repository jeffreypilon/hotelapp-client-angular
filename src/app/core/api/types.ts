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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /**
   * Omitted (never sent as `null`) when blank -- hotelapp-server-nodejs's `POST /auth/register`
   * schema currently rejects an explicit `null` here (`phone` is `.optional()` but not
   * `.nullable()`, unlike `PATCH /me`'s own phone field), confirmed live. Sending "absent" rather
   * than "null" for an unset optional field works against both backends either way.
   */
  phone?: string;
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

/** GET /availability's reference-list responses -- carries `sortOrder`, unlike `Amenity` above. */
export interface AmenityReference {
  code: string;
  name: string;
  sortOrder: number;
}

export interface RateCategoryOption {
  value: string;
  label: string;
}

/** GET /availability's embedded room-type shape -- flat, distinct from `RoomType` and `PropertyRoomTypeSummary`. */
export interface AvailabilityRoomType {
  id: string;
  code: string;
  name: string;
  maxOccupancy: number;
  bedConfiguration: string;
  isAccessible: boolean;
  amenities: Amenity[];
  primaryPhotoUrl: string | null;
}

/** GET /availability's embedded pricing -- its own shape, not shared with the reservation response. */
export interface Pricing {
  rateCategory: string;
  baseRate: string;
  discountPercent: string;
  nightlyRate: string;
  nights: number;
  totalAmount: string;
  currency: string;
}

export interface AvailabilityResult {
  roomType: AvailabilityRoomType;
  pricing: Pricing;
  availableRoomCount: number;
}

export interface AvailabilityResponse {
  data: AvailabilityResult[];
  pagination: Pagination;
}

/**
 * S6's form shape, per api-contracts.md's POST /reservations request body. Component-local form
 * state only -- never cached, logged, or persisted, per security-implementation.md#payment-data.
 */
export interface PaymentInput {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
}

export interface CreateReservationRequest {
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  numGuests: number;
  rateCategory: string;
  payment: PaymentInput;
}

/**
 * POST /reservations' embedded pricing -- confirmed against the React client's live response to
 * carry no `nights` or `rateCategory` (those live at the top level of `Reservation` instead),
 * unlike `Pricing` above which is GET /availability's shape. Conflating the two silently dropped
 * the nights count on S7 there -- typed narrowly here rather than assumed from that shape.
 */
export interface ReservationPricing {
  baseRate: string;
  discountPercent: string;
  nightlyRate: string;
  totalAmount: string;
  currency: string;
}

export interface CancellationStatus {
  deadline: string;
  isRefundableNow: boolean;
}

/** The full POST /reservations response shape -- also what GET /reservations/{id} returns. */
export interface Reservation {
  id: string;
  confirmationNumber: string;
  status: string;
  property: { id: string; name: string; timezone: string };
  roomType: { id: string; code: string; name: string };
  room: { id: string; roomNumber: string };
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  numGuests: number;
  rateCategory: string;
  pricing: ReservationPricing;
  cancellation: CancellationStatus;
  payment: { status: string; cardBrand: string; cardLastFour: string; processedAt: string };
  bookedAt: string;
}

/**
 * GET /reservations' own contract text, not `Reservation` reused -- narrower, per the same
 * summary-vs-detail split as `PropertyRoomTypeSummary`/`ReservationPricing` above. No `room`,
 * `pricing`, `payment`, or `bookedAt` here.
 */
export interface ReservationSummary {
  id: string;
  confirmationNumber: string;
  status: string;
  property: { id: string; name: string };
  roomType: { code: string; name: string };
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalAmount: string;
  currency: string;
  cancellation: CancellationStatus;
}

export interface ReservationListResponse {
  data: ReservationSummary[];
  pagination: Pagination;
}

/** POST /reservations/{id}/cancel's response -- deliberately smaller than `Reservation`. */
export interface CancelReservationResponse {
  id: string;
  confirmationNumber: string;
  status: string;
  cancelledAt: string;
  wasRefundable: boolean;
  refund: { status: string; amount: string; currency: string } | null;
}

/** PATCH /reservations/{id}'s request body -- roomTypeId/propertyId/pricing are not changeable here. */
export interface PatchReservationRequest {
  checkInDate?: string;
  checkOutDate?: string;
  numGuests?: number;
  rateCategory?: string;
}
