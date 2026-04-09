import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'opencode-user-text-part',
  imports: [CommonModule],
  template: `
    <p
      class="whitespace-pre-wrap relative w-fit max-w-[80%] md:max-w-[60%] flex-col gap-2 self-end rounded-[calc(var(--radius)*1.5)_calc(var(--radius)/2)_calc(var(--radius)*1.5)_calc(var(--radius)*1.5)] bg-[color-mix(in_oklab,var(--primary)_20%,transparent)] p-3 ml-auto border border-primary/20"
    >
      @for (part of userRenderedParts(); track $index) {
        <span
          [ngClass]="{
            'text-primary whitespace-nowrap truncate block': part.isHighlighted,
          }"
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

  protected readonly userRenderedParts = computed(() => {
    const rawText = this.text();
    const textLength = rawText.length;

    if (textLength === 0) {
      return [];
    }

    const normalizedRanges = [...this.highlightIndexes()]
      .map(({ start, end }) => ({
        start: Math.max(0, Math.min(start, textLength)),
        end: Math.max(0, Math.min(end, textLength)),
      }))
      .filter(({ start, end }) => start < end)
      .sort((a, b) => a.start - b.start);

    if (normalizedRanges.length === 0) {
      return [{ text: rawText, isHighlighted: false }];
    }

    const mergedRanges: { start: number; end: number }[] = [];
    for (const range of normalizedRanges) {
      const lastRange = mergedRanges.at(-1);
      if (!lastRange || range.start > lastRange.end) {
        mergedRanges.push({ ...range });
        continue;
      }

      lastRange.end = Math.max(lastRange.end, range.end);
    }

    const renderedParts: { text: string; isHighlighted: boolean }[] = [];
    let cursor = 0;

    for (const range of mergedRanges) {
      if (cursor < range.start) {
        renderedParts.push({
          text: rawText.slice(cursor, range.start),
          isHighlighted: false,
        });
      }

      renderedParts.push({
        text: rawText.slice(range.start, range.end),
        isHighlighted: true,
      });
      cursor = range.end;
    }

    if (cursor < textLength) {
      renderedParts.push({
        text: rawText.slice(cursor),
        isHighlighted: false,
      });
    }

    return renderedParts;
  });
}
