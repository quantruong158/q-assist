import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { MarkdownPipe } from './markdown.pipe';
import { ChatAttachment } from './chat.service';
import { provideIcons } from '@ng-icons/core';
import { hugeAiChat02 } from '@ng-icons/huge-icons';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-message',
  imports: [MarkdownPipe, MatIconModule],
  providers: [provideIcons({ hugeAiChat02 })],
  templateUrl: './message.html',
  styleUrl: './message.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Message {
  readonly content = input.required<string>();
  readonly role = input.required<'user' | 'assistant'>();
  readonly isStreaming = input(false);
  readonly attachments = input<ChatAttachment[]>();
}
