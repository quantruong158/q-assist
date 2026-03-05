import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';

import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { LayoutService } from '../services/layout.service';
import { SidebarStateService } from '../services/sidebar-state.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, HlmSidebarImports, Header, Sidebar],
  templateUrl: './layout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Layout implements OnInit {
  protected readonly layoutService = inject(LayoutService);
  private readonly sidebarStateService = inject(SidebarStateService);

  ngOnInit(): void {
    this.sidebarStateService.loadConversations();
  }
}
