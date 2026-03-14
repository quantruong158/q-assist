import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { ChatMessage } from '@qos/chat/shared-models';
import { ChatMessageItem } from '../message/message';

@Component({
  selector: 'chat-message-list',
  imports: [HlmSpinnerImports, ChatMessageItem],
  templateUrl: './message-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatMessageList {
  readonly messages = input.required<ChatMessage[]>();
  readonly streamingContent = input('');
  readonly isStreaming = input(false);
  readonly isConversationLoading = input(false);
  readonly isInitialChat = input(false);
  readonly currentUserDisplayName = input<string | undefined>();
}
