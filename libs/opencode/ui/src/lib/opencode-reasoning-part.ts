import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ReasoningPart } from '@qos/opencode/data-access';
import { MarkdownComponent } from 'ngx-markdown';
@Component({
  selector: 'opencode-reasoning-part',
  imports: [MarkdownComponent],
  template: `@if (text().length > 0) {
    <div class="border-l-3 border-primary pl-5 py-1 mb-1">
      <markdown
        class="wrap-break-word leading-7 text-sm opacity-70"
        [data]="text()"
        katex
      ></markdown>
    </div>
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeReasoningPartComponent {
  readonly part = input.required<ReasoningPart>();

  protected readonly text = computed(() => this.part().text);
}
