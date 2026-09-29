import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Header } from './shared/layout/header';
import { Footer } from './shared/layout/footer';
import { SessionStore } from './core/session/session.store';
import { Logger } from './shared/util/logger';

/** Root layout (S0 shell): header, routed content, footer, persistent across every screen. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  protected readonly session = inject(SessionStore);
  protected readonly bannerDismissed = signal(false);

  constructor() {
    const router = inject(Router);
    const logger = inject(Logger);
    const destroyRef = inject(DestroyRef);

    // Demo/debug visibility only, per logging-observability.md -- pathname never carries
    // sensitive data (query strings here are dates/guest counts/ids, not credentials).
    const sub = router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const [pathname, search] = e.urlAfterRedirects.split('?');
        logger.debug('navigated', { pathname, search: search ?? '' });
      });
    destroyRef.onDestroy(() => sub.unsubscribe());
  }

  protected dismissBanner(): void {
    this.bannerDismissed.set(true);
  }
}
