import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MyReservationsStore } from '../my-reservations.store';
import { ReservationStatusBadge } from '../components/reservation-status-badge';
import { Pagination } from '../../../shared/ui/pagination';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { formatDate } from '../../../shared/util/format';
import { resolveError } from '../../../shared/util/errors/messages';
import {
  DEFAULT_RESERVATION_SORT,
  RESERVATION_TABS,
  isReservationTab,
  reservationTabEmptyCopy,
  reservationTabParams,
  todayDateString,
  type ReservationTab,
} from '../../../shared/util/reservation-tabs';

const PAGE_SIZE = 20;

const TAB_LABELS: Record<ReservationTab, string> = {
  upcoming: 'Upcoming',
  past: 'Past',
  cancelled: 'Cancelled',
  all: 'All',
};

/**
 * S8b -- reservation history, per ui-specifications.md. Tab and page live in the URL, same
 * pattern as every prior list screen. All four tabs are `GET /reservations` with different
 * params; "today" is computed once per render from the browser's local calendar date, not a
 * property timezone -- a guest's reservations can span properties.
 */
@Component({
  selector: 'app-reservation-list-screen',
  imports: [RouterLink, ReservationStatusBadge, Pagination, MoneyPipe],
  providers: [MyReservationsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reservation-list-screen.html',
})
export class ReservationListScreen {
  protected readonly store = inject(MyReservationsStore);
  protected readonly tabs = RESERVATION_TABS;
  protected readonly tabLabels = TAB_LABELS;
  protected readonly resolveError = resolveError;
  protected readonly formatDate = formatDate;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly queryParamMap = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly tab = (): ReservationTab => {
    const value = this.queryParamMap().get('tab');
    return isReservationTab(value) ? value : 'upcoming';
  };
  protected readonly page = () => {
    const parsed = Number(this.queryParamMap().get('page') ?? '1');
    return Number.isFinite(parsed) ? parsed : 1;
  };
  protected readonly emptyCopy = () => reservationTabEmptyCopy[this.tab()];

  constructor() {
    effect(() => {
      const params = reservationTabParams(this.tab(), todayDateString());
      this.store.loadList({
        ...params,
        page: this.page(),
        pageSize: PAGE_SIZE,
        sort: DEFAULT_RESERVATION_SORT,
      });
    });
  }

  protected setTab(tab: ReservationTab): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab, page: null },
      queryParamsHandling: 'merge',
    });
  }

  protected setPage(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page },
      queryParamsHandling: 'merge',
    });
  }

  protected retry(): void {
    const params = reservationTabParams(this.tab(), todayDateString());
    this.store.loadList({
      ...params,
      page: this.page(),
      pageSize: PAGE_SIZE,
      sort: DEFAULT_RESERVATION_SORT,
    });
  }
}
