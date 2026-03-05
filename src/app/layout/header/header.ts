import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';

import { ThemeService } from '../../services/theme.service';
import { AuthService } from '../../services/auth.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeLogout03, hugeMoon02, hugeSun03, hugeUserCircle } from '@ng-icons/huge-icons';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';

@Component({
  selector: 'app-header',
  imports: [HlmButtonImports, HlmDropdownMenuImports, HlmIconImports, HlmSidebarImports, NgIcon],
  providers: [provideIcons({ hugeMoon02, hugeSun03, hugeLogout03, hugeUserCircle })],
  templateUrl: './header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly themeService = inject(ThemeService);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly menuClick = output<void>();

  protected onMenuClick(): void {
    this.menuClick.emit();
  }

  protected async onLogout(): Promise<void> {
    await this.authService.signout();
    this.router.navigate(['/login']);
  }
}
