import { Pipe, PipeTransform } from '@angular/core';

export interface MessageChunk {
  text: string;
  isKeyword: boolean;
}

@Pipe({
  name: 'highlight',
})
export class HighlightPipe implements PipeTransform {
  transform(text: string, keywords: string[]): MessageChunk[] {
    if (!text) {
      return [];
    }

    if (!keywords || keywords.length === 0) {
      return [{ text, isKeyword: false }];
    }

    const escapedKeys = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    const lookbehind = `(?<=^|\\s|["'(])`;
    const lookahead = `(?=$|\\s|[.,!?;:"')])`;

    const regex = new RegExp(`${lookbehind}(${escapedKeys.join('|')})${lookahead}`, 'gi');

    return text
      .split(regex)
      .filter((part) => part !== '')
      .map((part) => ({
        text: part,
        isKeyword: keywords.some((k) => k.toLowerCase() === part.toLowerCase()),
      }));
  }
}
