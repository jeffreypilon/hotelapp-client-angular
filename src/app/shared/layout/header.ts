import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { SessionStore } from '../../core/session/session.store';
import { AuthApi } from '../../core/api/auth.api';

const ROLE_BADGE: Record<string, string> = {
  FRONT_DESK_STAFF: 'Front Desk',
  PROPERTY_MANAGER: 'Manager',
};

/** S0 header: wordmark, primary nav, user area -- per ui-specifications.md's five-state table. */
@Component({
  selector: 'app-header',
  imports: [RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
})
export class Header {
  protected readonly session = inject(SessionStore);
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly mobileMenuOpen = signal(false);
  protected readonly userMenuOpen = signal(false);

  @ViewChild('userMenuRoot') private userMenuRoot?: ElementRef<HTMLElement>;

  protected roleBadge(): string | undefined {
    const role = this.session.role();
    return role ? ROLE_BADGE[role] : undefined;
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
  }

  protected closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  protected logout(): void {
    this.closeUserMenu();
    this.authApi.logout().subscribe({
      complete: () => {
        this.session.clear();
        void this.router.navigate(['/']);
      },
    });
  }

  @HostListener('document:mousedown', ['$event'])
  protected onDocumentMouseDown(event: MouseEvent): void {
    if (!this.userMenuOpen()) return;
    const root = this.userMenuRoot?.nativeElement;
    if (root && !root.contains(event.target as Node)) {
      this.closeUserMenu();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.closeUserMenu();
  }
}
