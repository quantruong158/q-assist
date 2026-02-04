import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeLogout03,
  hugeMoon02,
  hugeSidebarLeft,
  hugeSun03,
  hugeUserCircle,
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-header',
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    MatToolbarModule,
    MatTooltipModule,
    NgIcon,
  ],
  providers: [
    provideIcons({ hugeSidebarLeft, hugeMoon02, hugeSun03, hugeLogout03, hugeUserCircle }),
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Header {
  protected readonly themeService = inject(ThemeService);
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly showMenuButton = input(false);
  readonly menuClick = output<void>();

  protected onMenuClick(): void {
    this.menuClick.emit();
  }

  protected async onLogout(): Promise<void> {
    await this.authService.signout();
    this.router.navigate(['/login']);
  }
}
