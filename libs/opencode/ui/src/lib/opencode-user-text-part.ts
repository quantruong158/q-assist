import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { HighlightByIndexesPipe } from '@qos/shared/util-angular';

@Component({
  selector: 'opencode-user-text-part',
  imports: [HighlightByIndexesPipe],
  template: `
    <p
      class="whitespace-pre-wrap relative w-fit max-w-[80%] md:max-w-[60%] flex-col gap-2 self-end rounded-[calc(var(--radius)*1.5)_calc(var(--radius)/2)_calc(var(--radius)*1.5)_calc(var(--radius)*1.5)] bg-[color-mix(in_oklab,var(--primary)_20%,transparent)] p-3 ml-auto border border-primary/20"
    >
      @for (part of text() | highlightByIndexes: highlightIndexes(); track $index) {
        <span
          class="box-border whitespace-pre-wrap wrap-break-word"
          [class.text-primary]="part.isHighlighted"
          >{{ part.text }}</span
        >
      }
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeUserTextPartComponent {
  readonly text = input.required<string>();
  readonly highlightIndexes = input<{ start: number; end: number }[]>([]);
}
