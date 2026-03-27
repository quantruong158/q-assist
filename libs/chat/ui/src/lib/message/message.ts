import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeAiChat02, hugeArrowDown01 } from '@ng-icons/huge-icons';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { MarkdownComponent } from 'ngx-markdown';
import { ChatAttachment } from '@qos/chat/shared-models';
import { processStreamingMarkdown } from '@qos/chat/util';

const USER_MESSAGE_CHAR_LIMIT = 240;

@Component({
  selector: 'chat-message',
  imports: [HlmIconImports, MarkdownComponent, HlmButtonImports, NgIcon],
  providers: [provideIcons({ hugeAiChat02, hugeArrowDown01 })],
  templateUrl: './message.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'group/message' },
})
export class ChatMessageItem {
  readonly content = input.required<string>();
  readonly role = input.required<'user' | 'assistant'>();
  readonly isStreaming = input(false);
  readonly attachments = input<ChatAttachment[]>();
  readonly showActions = input(false);
  readonly isExpanded = signal(false);

  protected readonly renderedContent = computed(() => {
    const raw = this.content();
    return this.isStreaming() ? processStreamingMarkdown(raw) : raw;
  });

  protected readonly isContentTruncated = computed(
    () => this.renderedContent().length > USER_MESSAGE_CHAR_LIMIT,
  );

  protected readonly userMessageToggleLabel = computed(() =>
    this.isExpanded() ? 'Show less' : 'Show more',
  );

  protected readonly userMessagePreview = computed(() => {
    const content = this.renderedContent();
    if (content.length <= USER_MESSAGE_CHAR_LIMIT) {
      return content;
    }

    return `${content.slice(0, USER_MESSAGE_CHAR_LIMIT).trimEnd()}…`;
  });

  protected toggleUserMessage(): void {
    this.isExpanded.update((expanded) => !expanded);
  }
}
