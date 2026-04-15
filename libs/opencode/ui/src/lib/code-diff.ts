import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { parsePatch, type StructuredPatch } from 'diff';
import { NgClass } from '@angular/common';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { NgScrollbarModule } from 'ngx-scrollbar';
import {
  PrismToken,
  getLanguageFromFileName,
  tokenizeLine,
  isStringToken,
  getTokenClass,
  getTokenText,
} from '@qos/shared/util-angular';

export interface CodeDiffFileMetadata {
  relativePath: string;
  additions: number;
  deletions: number;
}

type LineKind = 'context' | 'addition' | 'deletion' | 'hunk' | 'meta' | 'content';

interface CodeLine {
  kind: LineKind;
  prefix: string;
  content: string;
  tokens: (string | PrismToken)[] | null;
}

interface FileView {
  fileName: string;
  additions: number;
  deletions: number;
  lines: CodeLine[];
}

@Component({
  selector: 'code-diff',
  imports: [NgClass, HlmScrollAreaImports, NgScrollbarModule],
  template: `
    <div class="py-1 flex flex-col gap-2">
      @for (file of files(); track file.fileName + '-' + $index) {
        <div class="rounded-md border overflow-hidden">
          <div
            class="flex items-center justify-between gap-2 border-b px-3 py-1.5 bg-muted/40 text-md"
          >
            <span class="truncate font-mono text-foreground">{{ file.fileName }}</span>
            @if (file.additions > 0 || file.deletions > 0) {
              <div class="flex items-center gap-2 font-mono">
                <span class="text-green-700 dark:text-green-400">+{{ file.additions }}</span>
                <span class="text-red-700 dark:text-red-400">-{{ file.deletions }}</span>
              </div>
            }
          </div>

          <ng-scrollbar
            hlm
            class="max-h-84 overflow-auto bg-background font-mono"
            appearance="compact"
          >
            @for (line of file.lines; track $index) {
              <div
                class="pl-3 whitespace-pre-wrap leading-6"
                [ngClass]="{
                  'bg-green-100 dark:bg-green-950 hover:bg-green-200 dark:hover:bg-green-950/80':
                    line.kind === 'addition',
                  'bg-red-100 dark:bg-red-950 hover:bg-red-200 dark:hover:bg-red-950/80':
                    line.kind === 'deletion',
                  hidden: line.kind === 'hunk',
                  'text-muted-foreground':
                    line.kind === 'context' || line.kind === 'meta' || line.kind === 'content',
                }"
              >
                @if (line.kind !== 'content') {
                  <span
                    [ngClass]="{
                      'text-green-700 dark:text-green-400': line.kind === 'addition',
                      'text-red-700 dark:text-red-400': line.kind === 'deletion',
                      'text-muted-foreground': line.kind === 'context' || line.kind === 'meta',
                    }"
                    >{{ line.prefix }}</span
                  >
                }
                @if (line.tokens) {
                  @for (token of line.tokens; track $index) {
                    @if (isStringToken(token)) {
                      <span>{{ token }}</span>
                    } @else {
                      <span [class]="'token ' + getTokenClass(token)">{{
                        getTokenText(token)
                      }}</span>
                    }
                  }
                } @else {
                  <span>{{ line.content }}</span>
                }
              </div>
            }
          </ng-scrollbar>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeDiffComponent {
  readonly diff = input('');
  readonly filesMetadata = input<CodeDiffFileMetadata[]>([]);
  readonly content = input('');
  readonly fileName = input('');

  protected readonly files = computed<FileView[]>(() => {
    const content = this.content();
    if (content) {
      const fileName = this.fileName() || 'unknown';
      const language = getLanguageFromFileName(fileName);
      return [
        {
          fileName,
          additions: 0,
          deletions: 0,
          lines: content.split('\n').map((line) => ({
            kind: 'content' as LineKind,
            prefix: '',
            content: line,
            tokens: tokenizeLine(line, language),
          })),
        },
      ];
    }

    const diff = this.diff();
    if (!diff.length) {
      return [];
    }

    const metadataByPath = new Map(
      this.filesMetadata().map((file) => [normalizePatchPath(file.relativePath), file]),
    );

    let patches: StructuredPatch[] = [];
    try {
      patches = parsePatch(diff);
    } catch {
      return [];
    }

    return patches.map((patch) => toFileView(patch, metadataByPath));
  });

  protected isStringToken = isStringToken;
  protected getTokenClass = getTokenClass;
  protected getTokenText = getTokenText;
}

function normalizePatchPath(path: string | undefined): string {
  if (!path || path === '/dev/null') {
    return '';
  }

  if (path.startsWith('a/') || path.startsWith('b/')) {
    return path.slice(2);
  }

  return path;
}

function resolvePatchFileName(patch: StructuredPatch): string {
  const oldName = normalizePatchPath(patch.oldFileName);
  const newName = normalizePatchPath(patch.newFileName);

  if (patch.isDelete) {
    return oldName || newName || 'unknown';
  }

  return newName || oldName || 'unknown';
}

function toFileView(
  patch: StructuredPatch,
  metadataByPath: Map<string, CodeDiffFileMetadata>,
): FileView {
  const fileName = resolvePatchFileName(patch);
  const metadata = metadataByPath.get(normalizePatchPath(fileName));
  const language = getLanguageFromFileName(fileName);

  const lines: CodeLine[] = [];
  for (const hunk of patch.hunks) {
    lines.push({
      kind: 'hunk',
      prefix: '',
      content: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
      tokens: null,
    });

    for (const line of hunk.lines) {
      lines.push(toDiffLine(line, language));
    }
  }

  if (patch.isBinary && lines.length === 0) {
    lines.push({ kind: 'meta', prefix: '', content: 'Binary file changed', tokens: null });
  }

  const additions = metadata?.additions ?? lines.filter((line) => line.kind === 'addition').length;
  const deletions = metadata?.deletions ?? lines.filter((line) => line.kind === 'deletion').length;

  return {
    fileName,
    additions,
    deletions,
    lines,
  };
}

function toDiffLine(line: string, language: string | null): CodeLine {
  if (line.startsWith('+')) {
    const content = line.slice(1);
    return {
      kind: 'addition',
      prefix: '+',
      content,
      tokens: tokenizeLine(content, language),
    };
  }

  if (line.startsWith('-')) {
    const content = line.slice(1);
    return {
      kind: 'deletion',
      prefix: '-',
      content,
      tokens: tokenizeLine(content, language),
    };
  }

  if (line.startsWith('\\')) {
    return { kind: 'meta', prefix: '', content: line, tokens: null };
  }

  return {
    kind: 'context',
    prefix: line[0] ?? ' ',
    content: line.slice(1),
    tokens: tokenizeLine(line.slice(1), language),
  };
}
