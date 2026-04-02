import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';

@Component({
  selector: 'opencode-text-part',
  imports: [MarkdownComponent],
  template: `
    @if (role() === 'user') {
      <p
        class="whitespace-pre-wrap"
        [class]="
          role() === 'user'
            ? 'relative flex w-fit max-w-[50%] flex-col gap-2 self-end rounded-[calc(var(--radius)*2)_calc(var(--radius)/2)_calc(var(--radius)*2)_calc(var(--radius)*2)] bg-[color-mix(in_oklab,var(--primary)_20%,transparent)] py-3 px-4 ml-auto'
            : ''
        "
      >
        {{ text() }}
      </p>
    } @else {
      <markdown class="wrap-break-word leading-7" [data]="text()" katex></markdown>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeTextPartComponent {
  readonly text = input.required<string>();
  readonly role = input.required<'user' | 'assistant'>();
}
