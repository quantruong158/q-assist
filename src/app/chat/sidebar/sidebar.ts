import { ChangeDetectionStrategy, Component, input, output, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSidebarImports } from '@spartan-ng/helm/sidebar';
import { HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { filter } from 'rxjs';

import { Conversation } from '../../models';
import { LongPressDirective } from '../../shared/directives/long-press.directive';
import { ConfirmationDialog } from '../../shared/components/confirmation-dialog/confirmation-dialog';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideChevronDown } from '@ng-icons/lucide';
import {
  hugeAdd01,
  hugeBubbleChatCancel,
  hugeDelete02,
  hugeMoreVerticalCircle01,
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-sidebar',
  imports: [
    DatePipe,
    HlmButtonImports,
    HlmCollapsibleImports,
    HlmDropdownMenuImports,
    HlmIconImports,
    HlmSidebarImports,
    LongPressDirective,
    NgIcon,
  ],
  providers: [
    provideIcons({
      hugeAdd01,
      hugeDelete02,
      hugeBubbleChatCancel,
      hugeMoreVerticalCircle01,
      lucideChevronDown,
    }),
  ],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly _dialog = inject(HlmDialogService);
  protected readonly sidebarService = inject(HlmSidebarService);

  readonly conversations = input.required<Conversation[]>();
  readonly activeConversationId = input<string | null>(null);

  readonly newChat = output<void>();
  readonly selectConversation = output<string>();
  readonly deleteConversation = output<string>();

  protected onNewChat(): void {
    this.newChat.emit();
  }

  protected onSelect(conversationId: string): void {
    this.selectConversation.emit(conversationId);
  }

  protected onDelete(event: Event, conversationId: string): void {
    event.stopPropagation();
    this.openDeleteConfirmation(conversationId);
  }

  private openDeleteConfirmation(conversationId: string): void {
    this._dialog
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
        this.deleteConversation.emit(conversationId);
      });
  }
}
