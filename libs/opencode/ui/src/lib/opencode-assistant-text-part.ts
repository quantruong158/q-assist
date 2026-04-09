import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { processStreamingMarkdown } from '@qos/chat/util';
import { StreamingTextPacer } from '@qos/shared/util-angular';

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
export class OpencodeAssistantTextPartComponent implements OnInit, OnDestroy {
  private readonly injector = inject(Injector);
  readonly text = input.required<string>();
  readonly isStreaming = input<boolean>(false);
  private readonly textPacer = new StreamingTextPacer();

  ngOnInit(): void {
    effect(
      () => {
        this.textPacer.sync(this.text(), this.isStreaming());
      },
      { injector: this.injector },
    );
  }

  protected readonly assistantRenderedContent = computed(() => {
    const streaming = this.isStreaming();
    const raw = streaming ? this.textPacer.revealedText() : this.text();
    return streaming ? processStreamingMarkdown(raw) : raw;
  });

  ngOnDestroy(): void {
    this.textPacer.destroy();
  }
}
