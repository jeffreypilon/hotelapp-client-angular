import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { PropertyDetailScreen } from './property-detail-screen';
import { PropertiesStore } from '../properties.store';
import { ApiError } from '../../../core/api/api-error';
import type { PropertyDetail, RoomType } from '../../../core/api/types';

function property(overrides: Partial<PropertyDetail> = {}): PropertyDetail {
  return {
    id: '1',
    name: 'Harborview Grand',
    slug: 'harborview-grand',
    description: 'A waterfront hotel.',
    photoUrl: null,
    address: {
      line1: '1 Harbor Way',
      line2: null,
      city: 'Portland',
      stateProvince: 'ME',
      postalCode: '04101',
      countryCode: 'US',
    },
    phone: null,
    timezone: 'America/New_York',
    roomTypeCount: 0,
    roomTypes: [],
    ...overrides,
  };
}

function roomType(overrides: Partial<RoomType> = {}): RoomType {
  return {
    id: 'rt-1',
    propertyId: '1',
    code: 'KING',
    name: 'Deluxe King',
    description: '',
    baseRate: '249.00',
    currency: 'USD',
    maxOccupancy: 2,
    bedConfiguration: 'one king bed',
    isAccessible: false,
    amenities: [],
    photos: [],
    ...overrides,
  };
}

// Per testing-standards.md's component-tests section: a page component's rendering is tested
// against a stub store, not a real store and real HTTP -- so a template failure never masquerades
// as a request failure.
function fakeStore(overrides: Record<string, unknown> = {}) {
  return {
    detail: signal<PropertyDetail | null>(null),
    isDetailLoading: signal(false),
    isDetailError: signal(false),
    detailError: signal<ApiError | null>(null),
    roomTypes: signal<RoomType[]>([]),
    isRoomTypesLoading: signal(false),
    isRoomTypesError: signal(false),
    isRoomTypesEmpty: signal(false),
    roomTypesError: signal<ApiError | null>(null),
    roomType: signal<RoomType | null>(null),
    isRoomTypeLoading: signal(false),
    isRoomTypeError: signal(false),
    roomTypeError: signal<ApiError | null>(null),
    loadProperty: () => undefined,
    loadRoomTypes: () => undefined,
    loadRoomType: () => undefined,
    clearRoomType: () => undefined,
    ...overrides,
  };
}

async function render(storeOverrides: Record<string, unknown> = {}) {
  TestBed.overrideComponent(PropertyDetailScreen, {
    set: { providers: [{ provide: PropertiesStore, useValue: fakeStore(storeOverrides) }] },
  });
  await TestBed.configureTestingModule({ providers: [provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(PropertyDetailScreen);
  fixture.componentRef.setInput('propertyIdOrSlug', 'harborview-grand');
  fixture.detectChanges();
  return fixture;
}

describe('PropertyDetailScreen', () => {
  it('loading: shows skeletons, no hero content', async () => {
    const fixture = await render({ isDetailLoading: signal(true) });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')).toBeNull();
  });

  it('success: renders name, address, and each room type', async () => {
    const fixture = await render({
      detail: signal(property({ name: 'Harborview Grand' })),
      roomTypes: signal([roomType({ name: 'Deluxe King' })]),
    });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Harborview Grand');
    expect(compiled.textContent).toContain('Portland, ME');
    expect(compiled.textContent).toContain('Deluxe King');
  });

  it('empty: "This hotel has no rooms listed yet." when the property has no room types', async () => {
    const fixture = await render({
      detail: signal(property()),
      roomTypes: signal([]),
      isRoomTypesEmpty: signal(true),
    });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('This hotel has no rooms listed yet.');
  });

  it('error NOT_FOUND: "We couldn\'t find that hotel." plus a link back to S1', async () => {
    const fixture = await render({
      isDetailError: signal(true),
      detailError: signal(new ApiError(404, 'NOT_FOUND', 'No such property.')),
    });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain("We couldn't find that hotel.");
    expect(compiled.querySelector('a[href="/"]')).not.toBeNull();
  });

  it('a generic error renders the mapped detail message, not the NOT_FOUND copy', async () => {
    const fixture = await render({
      isDetailError: signal(true),
      detailError: signal(new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong.')),
    });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Something went wrong.');
  });
});
