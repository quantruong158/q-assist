import remend, { type RemendHandler, type RemendOptions, isWithinCodeBlock } from 'remend';

function findLastMarkerIndex(stack: { marker: string; pos: number }[], marker: string): number {
  for (let i = stack.length - 1; i >= 0; i--) {
    if (stack[i].marker === marker) {
      return i;
    }
  }

  return -1;
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

function hasContent(t: string, start: number): boolean {
  for (let i = start; i < t.length; i++) {
    if (!isWhitespace(t[i])) return true;
  }
  return false;
}

const stripTrailingMarkers: RemendHandler = {
  name: 'stripTrailingMarkers',
  priority: -1,
  handle: (text: string): string => {
    let t = text;
    outer: while (true) {
      const len = t.length;
      if (len === 0) return t;

      const inCode = (markerLen: number): boolean => {
        const pos = len - markerLen - 1;
        return pos >= 0 && isWithinCodeBlock(t, pos);
      };

      if (
        len >= 3 &&
        t.charCodeAt(len - 1) === 96 &&
        t.charCodeAt(len - 2) === 96 &&
        t.charCodeAt(len - 3) === 96
      ) {
        if (inCode(3)) return t;
        const before = len > 3 ? t[len - 4] : '\n';
        if (before === '\n' || len === 3) {
          t = t.slice(0, -3);
          continue;
        }
        return t;
      }

      if (
        len >= 3 &&
        t.charCodeAt(len - 1) === 42 &&
        t.charCodeAt(len - 2) === 42 &&
        t.charCodeAt(len - 3) === 42
      ) {
        if (inCode(3)) return t;
        t = t.slice(0, -3);
        continue;
      }

      if (len >= 2) {
        const c1 = t.charCodeAt(len - 1);
        const c2 = t.charCodeAt(len - 2);
        if ((c1 === 42 && c2 === 42) || (c1 === 126 && c2 === 126)) {
          if (inCode(2)) return t;
          t = t.slice(0, -2);
          continue;
        }
      }

      const last = t.charCodeAt(len - 1);

      if (last === 42 && (len < 2 || t.charCodeAt(len - 2) !== 42)) {
        if (inCode(1)) return t;
        const prev = len >= 2 ? t[len - 2] : '';
        if (!prev || isWhitespace(prev)) {
          t = t.slice(0, -1);
          continue;
        }
        return t;
      }

      if (last === 95) {
        if (inCode(1)) return t;
        const prev = len >= 2 ? t[len - 2] : '';
        if (!prev || isWhitespace(prev)) {
          t = t.slice(0, -1);
          continue;
        }
        return t;
      }

      if (last === 96) {
        let btCount = 0;
        for (let i = len - 1; i >= 0 && t.charCodeAt(i) === 96; i--) btCount++;
        if (inCode(btCount)) return t;
        t = t.slice(0, -btCount);
        continue;
      }

      break outer;
    }
    return t;
  },
};

const closeFormattingMarkers: RemendHandler = {
  name: 'closeFormatting',
  priority: 5,
  handle: (text: string): string => {
    const len = text.length;
    if (len === 0) return text;

    const stack: { marker: string; pos: number }[] = [];
    let inInlineCode = false;
    let i = 0;

    while (i < len) {
      const cc = text.charCodeAt(i);

      if (cc === 92 && i + 1 < len) {
        i += 2;
        continue;
      }

      if (
        cc === 96 &&
        i + 2 < len &&
        text.charCodeAt(i + 1) === 96 &&
        text.charCodeAt(i + 2) === 96
      ) {
        i += 3;
        while (i < len && text.charCodeAt(i) !== 10) i++;
        if (i < len) i++;
        while (i < len) {
          if (
            text.charCodeAt(i) === 96 &&
            i + 2 < len &&
            text.charCodeAt(i + 1) === 96 &&
            text.charCodeAt(i + 2) === 96
          ) {
            i += 3;
            break;
          }
          i++;
        }
        continue;
      }

      if (cc === 96) {
        inInlineCode = !inInlineCode;
        if (!inInlineCode) {
          const topIdx = findLastMarkerIndex(stack, '`');
          if (topIdx >= 0) stack.splice(topIdx, 1);
        } else {
          stack.push({ marker: '`', pos: i });
        }
        i++;
        continue;
      }

      if (inInlineCode) {
        i++;
        continue;
      }

      if (
        cc === 42 &&
        i + 2 < len &&
        text.charCodeAt(i + 1) === 42 &&
        text.charCodeAt(i + 2) === 42
      ) {
        const topIdx = findLastMarkerIndex(stack, '***');
        if (topIdx >= 0) stack.splice(topIdx, 1);
        else stack.push({ marker: '***', pos: i });
        i += 3;
        continue;
      }

      if (cc === 42 && i + 1 < len && text.charCodeAt(i + 1) === 42) {
        const topIdx = findLastMarkerIndex(stack, '**');
        if (topIdx >= 0) stack.splice(topIdx, 1);
        else stack.push({ marker: '**', pos: i });
        i += 2;
        continue;
      }

      if (cc === 42) {
        const topIdx = findLastMarkerIndex(stack, '*');
        if (topIdx >= 0) {
          stack.splice(topIdx, 1);
        } else {
          const prevIsWs = i === 0 || isWhitespace(text[i - 1]);
          const nextIsWs = i + 1 >= len || isWhitespace(text[i + 1]);
          if (prevIsWs && !nextIsWs) stack.push({ marker: '*', pos: i });
        }
        i++;
        continue;
      }

      if (cc === 126 && i + 1 < len && text.charCodeAt(i + 1) === 126) {
        const topIdx = findLastMarkerIndex(stack, '~~');
        if (topIdx >= 0) stack.splice(topIdx, 1);
        else stack.push({ marker: '~~', pos: i });
        i += 2;
        continue;
      }

      if (cc === 95) {
        const topIdx = findLastMarkerIndex(stack, '_');
        if (topIdx >= 0) {
          stack.splice(topIdx, 1);
        } else {
          const prevIsWs = i === 0 || isWhitespace(text[i - 1]);
          const nextIsWs = i + 1 >= len || isWhitespace(text[i + 1]);
          if (prevIsWs && !nextIsWs) stack.push({ marker: '_', pos: i });
        }
        i++;
        continue;
      }

      i++;
    }

    if (stack.length === 0) return text;

    let result = text;
    for (let j = stack.length - 1; j >= 0; j--) {
      const { marker, pos } = stack[j];
      if (hasContent(text, pos + marker.length)) {
        result += marker;
      }
    }
    return result;
  },
};

export const STREAMING_REMEND_OPTIONS: RemendOptions = {
  bold: false,
  italic: false,
  boldItalic: false,
  inlineCode: false,
  strikethrough: false,
  handlers: [stripTrailingMarkers, closeFormattingMarkers],
};

export function processStreamingMarkdown(text: string): string {
  return remend(text, STREAMING_REMEND_OPTIONS);
}
