import { Pipe, PipeTransform } from '@angular/core';

export interface HighlightRange {
  start: number;
  end: number;
}

export interface HighlightedTextPart {
  text: string;
  isHighlighted: boolean;
}

export const splitTextByHighlightRanges = (
  text: string,
  highlightRanges: HighlightRange[] | null | undefined,
): HighlightedTextPart[] => {
  const textLength = text.length;
  if (textLength === 0) {
    return [];
  }

  const normalizedRanges = [...(highlightRanges ?? [])]
    .map(({ start, end }) => ({
      start: Math.max(0, Math.min(start, textLength)),
      end: Math.max(0, Math.min(end, textLength)),
    }))
    .filter(({ start, end }) => start < end)
    .sort((a, b) => a.start - b.start);

  if (normalizedRanges.length === 0) {
    return [{ text, isHighlighted: false }];
  }

  const mergedRanges: HighlightRange[] = [];
  for (const range of normalizedRanges) {
    const lastRange = mergedRanges.at(-1);
    if (!lastRange || range.start > lastRange.end) {
      mergedRanges.push({ ...range });
      continue;
    }

    lastRange.end = Math.max(lastRange.end, range.end);
  }

  const renderedParts: HighlightedTextPart[] = [];
  let cursor = 0;

  for (const range of mergedRanges) {
    if (cursor < range.start) {
      renderedParts.push({
        text: text.slice(cursor, range.start),
        isHighlighted: false,
      });
    }

    renderedParts.push({
      text: text.slice(range.start, range.end),
      isHighlighted: true,
    });
    cursor = range.end;
  }

  if (cursor < textLength) {
    renderedParts.push({
      text: text.slice(cursor),
      isHighlighted: false,
    });
  }

  return renderedParts;
};

@Pipe({
  name: 'highlightByIndexes',
  standalone: true,
})
export class HighlightByIndexesPipe implements PipeTransform {
  transform(
    text: string,
    highlightRanges: HighlightRange[] | null | undefined,
  ): HighlightedTextPart[] {
    return splitTextByHighlightRanges(text, highlightRanges);
  }
}
