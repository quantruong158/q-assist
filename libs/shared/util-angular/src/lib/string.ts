export function getTokenRangeAtCursor(
  text: string,
  cursorPos: number,
): { start: number; end: number } | null {
  const cursor = Math.max(0, Math.min(cursorPos, text.length));

  let start = cursor;
  while (start > 0 && !isWhitespace(text[start - 1])) {
    start -= 1;
  }

  let end = cursor;
  while (end < text.length && !isWhitespace(text[end])) {
    end += 1;
  }

  if (start === end) return null;

  return { start, end };
}

export function findTokenOccurrences(
  text: string,
  token: string,
): Array<{ start: number; end: number }> {
  if (!token) return [];

  const matches: Array<{ start: number; end: number }> = [];
  let index = 0;
  while (index < text.length) {
    const foundIndex = text.indexOf(token, index);
    if (foundIndex === -1) break;

    const beforeIndex = foundIndex - 1;
    const hasValidBoundaryBefore = beforeIndex < 0 || isWhitespace(text[beforeIndex]);
    if (hasValidBoundaryBefore) {
      matches.push({
        start: foundIndex,
        end: foundIndex + token.length,
      });
    }

    index = foundIndex + token.length;
  }

  return matches;
}

export function toFileUrl(path: string): string {
  return path.startsWith('file://') ? path : `file://${path}`;
}

export function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}
