import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { RoomTypeDetailScreen } from './room-type-detail-screen';
import { PropertiesStore } from '../properties.store';
import { ApiError } from '../../../core/api/api-error';
import type { RoomType } from '../../../core/api/types';

function roomType(overrides: Partial<RoomType> = {}): RoomType {
  return {
    id: 'rt-1',
    propertyId: '1',
    code: 'KING',
    name: 'Deluxe King',
    description: 'Corner room with a king bed.',
    baseRate: '249.00',
    currency: 'USD',
    maxOccupancy: 2,
    bedConfiguration: 'one king bed',
    isAccessible: false,
    amenities: [{ code: 'WIFI', name: 'Wi-Fi' }],
    photos: [],
    ...overrides,
  };
}

function fakeStore(overrides: Record<string, unknown> = {}) {
  return {
    roomType: signal<RoomType | null>(null),
    isRoomTypeLoading: signal(false),
    isRoomTypeError: signal(false),
    roomTypeError: signal<ApiError | null>(null),
    loadRoomType: () => undefined,
    ...overrides,
  };
}

async function render(storeOverrides: Record<string, unknown> = {}) {
  TestBed.overrideComponent(RoomTypeDetailScreen, {
    set: { providers: [{ provide: PropertiesStore, useValue: fakeStore(storeOverrides) }] },
  });
  await TestBed.configureTestingModule({ providers: [provideRouter([])] }).compileComponents();
  const fixture = TestBed.createComponent(RoomTypeDetailScreen);
  fixture.componentRef.setInput('roomTypeId', 'rt-1');
  fixture.detectChanges();
  return fixture;
}

describe('RoomTypeDetailScreen', () => {
  it('loading: shows a skeleton, no detail content', async () => {
    const fixture = await render({ isRoomTypeLoading: signal(true) });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')).toBeNull();
  });

  it('success: renders the full detail -- description, bed configuration, amenities', async () => {
    const fixture = await render({ roomType: signal(roomType()) });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h2')?.textContent).toContain('Deluxe King');
    expect(compiled.textContent).toContain('Corner room with a king bed.');
    expect(compiled.textContent).toContain('one king bed');
    expect(compiled.textContent).toContain('Wi-Fi');
    expect(compiled.textContent).toContain('$249.00');
  });

  it('error NOT_FOUND: "We couldn\'t find that room." plus a link back to S1', async () => {
    const fixture = await render({
      isRoomTypeError: signal(true),
      roomTypeError: signal(new ApiError(404, 'NOT_FOUND', 'No such room type.')),
    });
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain("We couldn't find that room.");
    expect(compiled.querySelector('a[href="/"]')).not.toBeNull();
  });
});
