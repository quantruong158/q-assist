import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
import { ConversationService } from './conversation.service';
import { Conversation } from '../models';
import { toast } from 'ngx-sonner';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  private readonly authService = inject(AuthService);
  private readonly conversationService = inject(ConversationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly conversations = signal<Conversation[]>([]);

  loadConversations(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    this.conversationService
      .getConversations(user.uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (conversations) => this.conversations.set(conversations),
        error: (error) => console.error('Error loading conversations:', error),
      });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) return;

    try {
      await this.conversationService.deleteConversation(user.uid, conversationId);
      toast.success('Conversation deleted successfully');

      if (this.conversationService.activeConversationId() === conversationId) {
        this.router.navigate(['/chat']);
      }
    } catch (error) {
      toast.error('Error deleting conversation');
      console.error('Error deleting conversation:', error);
    }
  }
}
