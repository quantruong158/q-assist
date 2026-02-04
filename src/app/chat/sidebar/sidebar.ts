import { ChangeDetectionStrategy, Component, input, output, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatBottomSheet, MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs';

import { Conversation } from '../../models';
import { LongPressDirective } from '../../shared/directives/long-press.directive';
import { DeleteSheet } from './delete-sheet';
import { ConfirmationDialog } from '../../shared/components/confirmation-dialog/confirmation-dialog';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeAdd01,
  hugeBubbleChatCancel,
  hugeDelete02,
  hugeMoreVerticalCircle01,
} from '@ng-icons/huge-icons';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-sidebar',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
    MatBottomSheetModule,
    MatDialogModule,
    LongPressDirective,
    NgIcon,
    MatMenuModule,
  ],
  providers: [
    provideIcons({ hugeAdd01, hugeDelete02, hugeBubbleChatCancel, hugeMoreVerticalCircle01 }),
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  private readonly _bottomSheet = inject(MatBottomSheet);
  private readonly _dialog = inject(MatDialog);

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

  protected onLongPress(conversationId: string): void {
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    this._bottomSheet
      .open(DeleteSheet, {
        autoFocus: false,
      })
      .afterDismissed()
      .pipe(filter((result) => result === true))
      .subscribe(() => {
        this.openDeleteConfirmation(conversationId);
      });
  }

  private openDeleteConfirmation(conversationId: string): void {
    this._dialog
      .open(ConfirmationDialog, {
        data: {
          title: 'Delete Conversation?',
          message:
            'Are you sure you want to delete this conversation? This action cannot be undone.',
          confirmText: 'Delete',
        },
        autoFocus: false,
      })
      .afterClosed()
      .pipe(filter((result) => result === true))
      .subscribe(() => {
        this.deleteConversation.emit(conversationId);
      });
  }
}
