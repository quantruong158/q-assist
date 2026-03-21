import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmSidebarImports, HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeAiChat02,
  hugeBubbleChatCancel,
  hugeDelete02,
  hugeMoneyBag02,
  hugeMoreVerticalCircle01,
  hugeMoon02,
  hugeSun03,
  hugeSettings02,
  hugeArrowDown01,
} from '@ng-icons/huge-icons';
import { AuthStore } from '@qos/shared/auth/data-access';
import { Conversation, ConversationService } from '@qos/chat/data-access';
import { ThemeService } from '@qos/shared/data-access';
import { filter } from 'rxjs';
import { toast } from 'ngx-sonner';
import { ConfirmationDialog } from '../confirmation-dialog/confirmation-dialog';
import { LayoutService } from '@qos/shared/data-access';

@Component({
  selector: 'shell-sidebar',
  imports: [
    DatePipe,
    RouterLink,
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
      hugeMoon02,
      hugeSun03,
      hugeArrowDown01,
      hugeSettings02,
    }),
  ],
  templateUrl: './sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly dialog = inject(HlmDialogService);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly themeService = inject(ThemeService);
  protected readonly sidebarService = inject(HlmSidebarService);
  protected readonly conversationService = inject(ConversationService);
  protected readonly layoutService = inject(LayoutService);

  protected readonly conversations = signal<Conversation[]>([]);

  constructor() {
    this.loadConversations();
  }

  protected openDeleteConversationConfirmation(event: Event, conversationId: string): void {
    event.preventDefault();
    event.stopPropagation();

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
        void this.deleteConversation(conversationId);
      });
  }

  protected onThemeToggle(): void {
    this.themeService.toggleTheme();
  }

  private loadConversations(): void {
    const user = this.authStore.currentUser();
    if (!user) {
      return;
    }

    this.conversationService
      .getConversations(user.uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversations) => this.conversations.set(conversations),
        error: (error) => console.error('Error loading conversations:', error),
      });
  }

  private async deleteConversation(conversationId: string): Promise<void> {
    const user = this.authStore.currentUser();
    if (!user) {
      return;
    }

    try {
      await this.conversationService.deleteConversation(user.uid, conversationId);
      toast.success('Conversation deleted successfully');

      if (this.conversationService.activeConversationId() === conversationId) {
        await this.router.navigate(['/chat']);
      }
    } catch (error) {
      toast.error('Error deleting conversation');
      console.error('Error deleting conversation:', error);
    }
  }
}
