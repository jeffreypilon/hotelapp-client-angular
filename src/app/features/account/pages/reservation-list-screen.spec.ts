import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { signal } from '@angular/core';
import { ReservationListScreen } from './reservation-list-screen';
import { MyReservationsStore } from '../my-reservations.store';
import { ApiError } from '../../../core/api/api-error';
import type { Pagination, ReservationSummary } from '../../../core/api/types';

function summary(overrides: Partial<ReservationSummary> = {}): ReservationSummary {
  return {
    id: 'r-1',
    confirmationNumber: 'HA1234ABCD',
    status: 'CONFIRMED',
    property: { id: 'p-1', name: 'Harborview Grand' },
    roomType: { code: 'KING', name: 'Deluxe King' },
    checkInDate: '2026-11-12',
    checkOutDate: '2026-11-14',
    nights: 2,
    totalAmount: '498.00',
    currency: 'USD',
    cancellation: { deadline: '2026-11-10T05:00:00Z', isRefundableNow: true },
    ...overrides,
  };
}

function pagination(overrides: Partial<Pagination> = {}): Pagination {
  return {
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
    hasPreviousPage: false,
    hasNextPage: false,
    ...overrides,
  };
}

// Per testing-standards.md's component-tests section: a page component's rendering is tested
// against a stub store, not a real store and real HTTP.
function fakeStore(overrides: Record<string, unknown> = {}) {
  return {
    list: signal<ReservationSummary[]>([]),
    listPagination: signal<Pagination | null>(null),
    isListLoading: signal(false),
    isListError: signal(false),
    isListEmpty: signal(false),
    listError: signal<ApiError | null>(null),
    loadList: () => undefined,
    ...overrides,
  };
}

async function render(url: string, storeOverrides: Record<string, unknown> = {}) {
  TestBed.overrideComponent(ReservationListScreen, {
    set: { providers: [{ provide: MyReservationsStore, useValue: fakeStore(storeOverrides) }] },
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter(
        [{ path: 'account/reservations', component: ReservationListScreen }],
        withComponentInputBinding(),
      ),
    ],
  });
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl(url, ReservationListScreen);
  harness.detectChanges();
  return { harness, component };
}

describe('ReservationListScreen', () => {
  it('defaults to the Upcoming tab and requests from=today', async () => {
    const loadList = vi.fn();
    await render('/account/reservations', { loadList });
    expect(loadList).toHaveBeenCalledWith(expect.objectContaining({ from: expect.any(String) }));
  });

  it('the Cancelled tab requests status=CANCELLED', async () => {
    const loadList = vi.fn();
    await render('/account/reservations?tab=cancelled', { loadList });
    expect(loadList).toHaveBeenCalledWith(expect.objectContaining({ status: ['CANCELLED'] }));
  });

  it('loading: shows skeletons', async () => {
    const { harness } = await render('/account/reservations', { isListLoading: signal(true) });
    expect(harness.routeNativeElement?.querySelectorAll('.animate-pulse').length).toBeGreaterThan(
      0,
    );
  });

  it('empty on Upcoming: shows the tab-specific copy and a "Find a room" link', async () => {
    const { harness } = await render('/account/reservations', { isListEmpty: signal(true) });
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('You have no upcoming stays.');
    expect(text).toContain('Find a room');
  });

  it('empty on Past: shows the Past-specific copy with no "Find a room" link', async () => {
    const { harness } = await render('/account/reservations?tab=past', {
      isListEmpty: signal(true),
    });
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('You have no past stays.');
    expect(text).not.toContain('Find a room');
  });

  it('success: renders a row with hotel, room type, status, total, and a View link', async () => {
    const { harness } = await render('/account/reservations', {
      list: signal([summary()]),
      listPagination: signal(pagination({ totalItems: 1 })),
    });
    const text = harness.routeNativeElement?.textContent ?? '';
    expect(text).toContain('Harborview Grand');
    expect(text).toContain('Deluxe King');
    expect(text).toContain('Confirmed');
    expect(text).toContain('$498.00');
    expect(text).toContain('HA1234ABCD');
    const viewLink = harness.routeNativeElement?.querySelector(
      'a[href="/account/reservations/r-1"]',
    );
    expect(viewLink).toBeTruthy();
  });

  it('cancelled rows show struck-through dates', async () => {
    const { harness } = await render('/account/reservations?tab=cancelled', {
      list: signal([summary({ status: 'CANCELLED' })]),
      listPagination: signal(pagination({ totalItems: 1 })),
    });
    const struck = harness.routeNativeElement?.querySelector('.line-through');
    expect(struck).toBeTruthy();
  });

  it('error: shows the resolved message and a retry action that reloads the list', async () => {
    const loadList = vi.fn();
    const { harness } = await render('/account/reservations', {
      isListError: signal(true),
      listError: signal(new ApiError(500, 'INTERNAL_ERROR', 'boom')),
      loadList,
    });
    expect(harness.routeNativeElement?.textContent).toContain(
      'Something went wrong on our end. Please try again.',
    );
    loadList.mockClear();
    harness.routeNativeElement?.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    expect(loadList).toHaveBeenCalledTimes(1);
  });
});
