import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { processStreamingMarkdown } from '@qos/chat/util';

@Component({
  selector: 'opencode-assistant-text-part',
  imports: [MarkdownComponent],
  template: `
    <div class="py-5">
      <markdown
        class="wrap-break-word leading-9"
        [data]="assistantRenderedContent()"
        katex
      ></markdown>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeAssistantTextPartComponent {
  readonly text = input.required<string>();
  readonly isStreaming = input<boolean>(false);

  protected readonly assistantRenderedContent = computed(() => {
    const raw = this.text();
    return this.isStreaming() ? processStreamingMarkdown(raw) : raw;
  });
}
