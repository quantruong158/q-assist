import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'opencode-reasoning-part',
  imports: [MarkdownComponent],
  template: `
    <div class="border-l-3 border-primary pl-3 py-1">
      <markdown
        class="wrap-break-word leading-7 text-sm text-muted-foreground"
        [data]="text()"
        katex
      ></markdown>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeReasoningPartComponent {
  readonly text = input.required<string>();
}
