import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeLogout03, hugeUserCircle } from '@ng-icons/huge-icons';
import { AuthService, AuthStore } from '@qos/shared/auth/data-access';

@Component({
  selector: 'shell-header',
  imports: [HlmButtonImports, HlmDropdownMenuImports, HlmIconImports, HlmSidebarImports, NgIcon],
  providers: [provideIcons({ hugeLogout03, hugeUserCircle })],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly authService = inject(AuthService);
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  readonly menuClick = output<void>();

  protected onMenuClick(): void {
    this.menuClick.emit();
  }

  protected async onLogout(): Promise<void> {
    await this.authService.signout();
    await this.router.navigate(['/login']);
  }
}
