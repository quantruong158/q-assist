import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { parsePatch, type StructuredPatch } from 'diff';
import type { ToolStateCompleted } from '@qos/opencode/data-access';
import { NgClass } from '@angular/common';
import { HlmScrollAreaImports } from '@spartan-ng/helm/scroll-area';
import { NgScrollbarModule } from 'ngx-scrollbar';

interface ApplyPatchFileMetadata {
  relativePath: string;
  additions: number;
  deletions: number;
}

type ApplyPatchLineKind = 'context' | 'addition' | 'deletion' | 'hunk' | 'meta';

interface ApplyPatchLine {
  kind: ApplyPatchLineKind;
  content: string;
}

interface ApplyPatchFileView {
  fileName: string;
  additions: number;
  deletions: number;
  lines: ApplyPatchLine[];
}

@Component({
  selector: 'opencode-apply-patch-diff',
  imports: [NgClass, HlmScrollAreaImports, NgScrollbarModule],
  template: `
    <div class="py-1 flex flex-col gap-2 pl-5 pr-3">
      @for (file of files(); track file.fileName + '-' + $index) {
        <div class="rounded-md border overflow-hidden">
          <div
            class="flex items-center justify-between gap-2 border-b px-3 py-1.5 bg-muted/40 text-md"
          >
            <span class="truncate font-mono text-foreground">{{ file.fileName }}</span>
            <div class="flex items-center gap-2 font-mono">
              <span class="text-green-700 dark:text-green-400">+{{ file.additions }}</span>
              <span class="text-red-700 dark:text-red-400">-{{ file.deletions }}</span>
            </div>
          </div>

          <ng-scrollbar
            hlm
            class="max-h-80 overflow-auto bg-background font-mono"
            appearance="compact"
          >
            @for (line of file.lines; track $index) {
              <div
                class="pl-2 whitespace-pre-wrap leading-6"
                [ngClass]="{
                  'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-950/80':
                    line.kind === 'addition',
                  'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-950/80':
                    line.kind === 'deletion',
                  hidden: line.kind === 'hunk',
                  'text-muted-foreground': line.kind === 'context' || line.kind === 'meta',
                }"
              >
                {{ line.content }}
              </div>
            }
          </ng-scrollbar>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeApplyPatchDiffComponent {
  readonly state = input.required<ToolStateCompleted>();

  protected readonly files = computed<ApplyPatchFileView[]>(() => {
    const diff = this.state().metadata['diff'];
    if (typeof diff !== 'string' || diff.length === 0) {
      return [];
    }

    const metadataFiles = this.getMetadataFiles(this.state().metadata['files']);
    const metadataByPath = new Map(
      metadataFiles.map((file) => [this.normalizePatchPath(file.relativePath), file]),
    );

    let patches: StructuredPatch[] = [];
    try {
      patches = parsePatch(diff);
    } catch {
      return [];
    }

    return patches.map((patch) => this.toFileView(patch, metadataByPath));
  });

  private getMetadataFiles(value: unknown): ApplyPatchFileMetadata[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((file): file is Record<string, unknown> => typeof file === 'object' && file !== null)
      .map((file) => ({
        relativePath: file['relativePath'] as string,
        additions: file['additions'] as number,
        deletions: file['deletions'] as number,
      }));
  }

  private toFileView(
    patch: StructuredPatch,
    metadataByPath: Map<string, ApplyPatchFileMetadata>,
  ): ApplyPatchFileView {
    const fileName = this.resolvePatchFileName(patch);
    const metadata = metadataByPath.get(this.normalizePatchPath(fileName));

    const lines: ApplyPatchLine[] = [];
    for (const hunk of patch.hunks) {
      lines.push({
        kind: 'hunk',
        content: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
      });

      for (const line of hunk.lines) {
        lines.push(this.toLine(line));
      }
    }

    if (patch.isBinary && lines.length === 0) {
      lines.push({ kind: 'meta', content: 'Binary file changed' });
    }

    const additions =
      metadata?.additions ?? lines.filter((line) => line.kind === 'addition').length;
    const deletions =
      metadata?.deletions ?? lines.filter((line) => line.kind === 'deletion').length;

    return {
      fileName,
      additions,
      deletions,
      lines,
    };
  }

  private toLine(line: string): ApplyPatchLine {
    if (line.startsWith('+')) {
      return { kind: 'addition', content: line };
    }

    if (line.startsWith('-')) {
      return { kind: 'deletion', content: line };
    }

    if (line.startsWith('\\')) {
      return { kind: 'meta', content: line };
    }

    return { kind: 'context', content: line };
  }

  private resolvePatchFileName(patch: StructuredPatch): string {
    const oldName = this.normalizePatchPath(patch.oldFileName);
    const newName = this.normalizePatchPath(patch.newFileName);

    if (patch.isDelete) {
      return oldName || newName || 'unknown';
    }

    return newName || oldName || 'unknown';
  }

  private normalizePatchPath(path: string | undefined): string {
    if (!path || path === '/dev/null') {
      return '';
    }

    if (path.startsWith('a/') || path.startsWith('b/')) {
      return path.slice(2);
    }

    return path;
  }
}
