import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { processStreamingMarkdown } from '../streaming-markdown';
import { provideIcons } from '@ng-icons/core';
import { hugeAiChat02 } from '@ng-icons/huge-icons';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { MarkdownComponent } from 'ngx-markdown';
import { ChatAttachment } from '../chat.model';

@Component({
  selector: 'app-message',
  imports: [HlmIconImports, MarkdownComponent],
  providers: [provideIcons({ hugeAiChat02 })],
  templateUrl: './message.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Message {
  readonly content = input.required<string>();
  readonly role = input.required<'user' | 'assistant'>();
  readonly isStreaming = input(false);
  readonly attachments = input<ChatAttachment[]>();

  protected readonly renderedContent = computed(() => {
    const raw = this.content();
    return this.isStreaming() ? processStreamingMarkdown(raw) : raw;
  });
}
