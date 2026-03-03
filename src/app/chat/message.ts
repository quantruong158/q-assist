import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { MarkdownPipe } from './markdown.pipe';
import { ChatAttachment } from './chat.service';
import { provideIcons } from '@ng-icons/core';
import { hugeAiChat02 } from '@ng-icons/huge-icons';
import { HlmIconImports } from '@spartan-ng/helm/icon';

@Component({
  selector: 'app-message',
  imports: [MarkdownPipe, HlmIconImports],
  providers: [provideIcons({ hugeAiChat02 })],
  templateUrl: './message.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Message {
  readonly content = input.required<string>();
  readonly role = input.required<'user' | 'assistant'>();
  readonly isStreaming = input(false);
  readonly attachments = input<ChatAttachment[]>();
}
