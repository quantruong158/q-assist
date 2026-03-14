import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { LayoutService } from '@qos/shared/data-access';

@Component({
  selector: 'shell-layout',
  imports: [RouterOutlet, HlmSidebarImports, Header, Sidebar, HlmToasterImports],
  templateUrl: './layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellLayout {
  protected readonly layoutService = inject(LayoutService);
}
