import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { filter } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import {
  hugeAiChat02,
  hugeBubbleChatCancel,
  hugeDelete02,
  hugeMoneyBag02,
  hugeMoreVerticalCircle01,
} from '@ng-icons/huge-icons';

import { SidebarStateService } from '../services/sidebar-state.service';
import { ConversationService } from '../services/conversation.service';
import { ConfirmationDialog } from '../shared/components/confirmation-dialog/confirmation-dialog';

@Component({
  selector: 'app-sidebar',
  imports: [
    DatePipe,
    RouterLink,
    HlmButtonImports,
    HlmCollapsibleImports,
    HlmDropdownMenuImports,
    HlmIconImports,
    HlmSidebarImports,
    NgIcon,
  ],
  providers: [
    provideIcons({
      hugeAiChat02,
      hugeDelete02,
      hugeBubbleChatCancel,
      hugeMoreVerticalCircle01,
      hugeMoneyBag02,
      lucideChevronDown,
    }),
  ],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly dialog = inject(HlmDialogService);
  protected readonly sidebarService = inject(HlmSidebarService);
  protected readonly sidebarState = inject(SidebarStateService);
  protected readonly conversationService = inject(ConversationService);

  protected openDeleteConversationConfirmation(event: Event, conversationId: string): void {
    this.dialog
      .open(ConfirmationDialog, {
        context: {
          title: 'Delete Conversation?',
          message:
            'Are you sure you want to delete this conversation? This action cannot be undone.',
          confirmText: 'Delete',
        },
      })
      .closed$.pipe(filter((result) => result === true))
      .subscribe(() => {
        this.sidebarState.deleteConversation(conversationId);
      });
  }
}
