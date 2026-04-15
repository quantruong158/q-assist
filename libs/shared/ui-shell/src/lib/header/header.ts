import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSheetImports } from '@spartan-ng/helm/sheet';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeAdd01,
  hugeChatting01,
  hugeLeftToRightListBullet,
  hugeListView,
  hugeLogout03,
  hugeUserCircle,
} from '@ng-icons/huge-icons';
import { AuthService, AuthStore } from '@qos/shared/auth/data-access';
import { OpencodeStateStore } from '@qos/opencode/data-access';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'shell-header',
  imports: [
    DatePipe,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmIconImports,
    HlmSheetImports,
    HlmSidebarImports,
    HlmSpinnerImports,
    NgIcon,
  ],
  providers: [
    provideIcons({
      hugeAdd01,
      hugeLogout03,
      hugeUserCircle,
      hugeLeftToRightListBullet,
      hugeListView,
      hugeChatting01,
    }),
  ],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly authService = inject(AuthService);
  protected readonly authStore = inject(AuthStore);
  protected readonly opencodeStore = inject(OpencodeStateStore);
  private readonly router = inject(Router);

  readonly menuClick = output<void>();

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly showOpencodeStatus = computed(() => this.currentUrl().startsWith('/opencode'));

  protected onMenuClick(): void {
    this.menuClick.emit();
  }

  protected async onLogout(): Promise<void> {
    await this.authService.signout();
    await this.router.navigate(['/login']);
  }

  protected onSelectOpencodeSession(sessionId: string): void {
    this.opencodeStore.setActiveSession(sessionId);
  }

  protected onNewOpencodeSession(): void {
    this.opencodeStore.setActiveSession(null);
  }
}
