import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ToolPart, ToolStateCompleted } from '@qos/opencode/data-access';
import { ToolPartShellComponent } from './tool-part-shell';
import { CodeDiffComponent, type CodeDiffFileMetadata } from './code-diff';

@Component({
  selector: 'tool-apply-patch',
  imports: [ToolPartShellComponent, CodeDiffComponent],
  template: `
    <tool-part-shell
      name="Patch"
      [metadata]="metadata()"
      [status]="status()"
      [isCollapsible]="isCollapsible()"
      [state]="part().state"
    >
      @if (totalAdditions() > 0 || totalDeletions() > 0) {
        <span stats class="flex items-center gap-2 font-mono text-xs font-normal">
          <span class="text-green-700 dark:text-green-400">+{{ totalAdditions() }}</span>
          <span class="text-red-700 dark:text-red-400">-{{ totalDeletions() }}</span>
        </span>
      }
      <code-diff [diff]="diff()" [filesMetadata]="files()" />
    </tool-part-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolApplyPatchComponent {
  readonly part = input.required<ToolPart>();

  protected readonly status = computed(() => this.part().state.status);

  protected readonly metadata = computed(() => {
    const files = this.files();
    return files.length === 1 ? files[0].relativePath : `${files.length} files`;
  });

  protected readonly isCollapsible = computed(() => {
    const status = this.status();
    if (status === 'completed') return this.diff().length > 0;
    if (status === 'error') return true;
    return false;
  });

  protected readonly totalAdditions = computed(() =>
    this.files().reduce((sum, f) => sum + f.additions, 0),
  );

  protected readonly totalDeletions = computed(() =>
    this.files().reduce((sum, f) => sum + f.deletions, 0),
  );

  protected readonly diff = computed(() => {
    if (this.part().state.status !== 'completed') return '';
    const state = this.part().state as ToolStateCompleted;
    const diff = state.metadata['diff'];
    return typeof diff === 'string' ? diff : '';
  });

  protected readonly files = computed<CodeDiffFileMetadata[]>(() => {
    if (this.part().state.status !== 'completed') return [];
    const state = this.part().state as ToolStateCompleted;
    return this.extractFileMetadata(state.metadata['files']);
  });

  private extractFileMetadata(value: unknown): CodeDiffFileMetadata[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((file): file is Record<string, unknown> => typeof file === 'object' && file !== null)
      .map((file) => ({
        relativePath: typeof file['relativePath'] === 'string' ? file['relativePath'] : 'unknown',
        additions: typeof file['additions'] === 'number' ? file['additions'] : 0,
        deletions: typeof file['deletions'] === 'number' ? file['deletions'] : 0,
      }));
  }
}
