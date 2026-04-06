import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { HighlightPipe } from '@qos/shared/util-angular';

@Component({
  selector: 'opencode-text-part',
  imports: [MarkdownComponent, HighlightPipe],
  template: `@if (role() === 'user') {
      <p
        class="whitespace-pre-wrap relative w-fit max-w-[80%] md:max-w-[60%] flex-col gap-2 self-end rounded-[calc(var(--radius)*1.5)_calc(var(--radius)/2)_calc(var(--radius)*1.5)_calc(var(--radius)*1.5)] bg-[color-mix(in_oklab,var(--primary)_20%,transparent)] p-3 ml-auto border border-primary/20"
      >
        @for (chunk of text() | highlight: keywords(); track $index) {
          @if (chunk.isKeyword) {
            <span class="text-primary whitespace-nowrap">{{ chunk.text }}</span>
          } @else {
            {{ chunk.text }}
          }
        }
      </p>
    } @else {
      <div class="py-5">
        <markdown class="wrap-break-word leading-9" [data]="text()" katex></markdown>
      </div>
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeTextPartComponent {
  readonly text = input.required<string>();
  readonly role = input.required<'user' | 'assistant'>();

  protected readonly keywords = input<string[]>(['opencode']);
}
