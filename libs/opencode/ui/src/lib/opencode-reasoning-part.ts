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
import { ReasoningPart } from '@qos/opencode/data-access';
import { StreamingTextPacer } from '@qos/shared/util-angular';

@Component({
  selector: 'opencode-reasoning-part',
  imports: [MarkdownComponent],
  template: `@if (text().length > 0) {
    <div class="border-l-3 border-primary pl-5 py-1">
      <markdown
        class="wrap-break-word leading-7 text-sm opacity-70"
        [data]="text()"
        katex
      ></markdown>
    </div>
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeReasoningPartComponent implements OnInit, OnDestroy {
  private readonly injector = inject(Injector);
  readonly part = input.required<ReasoningPart>();
  readonly isStreaming = input<boolean>(false);
  private readonly textPacer = new StreamingTextPacer();

  ngOnInit(): void {
    effect(
      () => {
        this.textPacer.sync(this.part().text, this.isStreaming());
      },
      { injector: this.injector },
    );
  }

  protected readonly text = computed(() => {
    const isStreaming = this.isStreaming();
    const rawText = isStreaming ? this.textPacer.revealedText() : this.part().text;
    return isStreaming ? processStreamingMarkdown(rawText) : rawText;
  });

  ngOnDestroy(): void {
    this.textPacer.destroy();
  }
}
