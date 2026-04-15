import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ToolPart, ToolStateCompleted } from '@qos/opencode/data-access';
import { ToolPartShellComponent } from './tool-part-shell';
import { CodeDiffComponent, type CodeDiffFileMetadata } from './code-diff';

@Component({
  selector: 'tool-edit',
  imports: [ToolPartShellComponent, CodeDiffComponent],
  template: `
    <tool-part-shell
      name="Edit"
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
export class ToolEditComponent {
  readonly part = input.required<ToolPart>();

  protected readonly status = computed(() => this.part().state.status);

  protected readonly metadata = computed(() => {
    const state = this.part().state;
    return typeof state.input['filePath'] === 'string'
      ? (state.input['filePath'] as string)
      : state.status !== 'pending' && state.status !== 'error'
        ? (state.title ?? '')
        : '';
  });

  protected readonly isCollapsible = computed(() => {
    const status = this.status();
    if (status === 'completed') return this.diff().length > 0;
    return status === 'error';
  });

  protected readonly diff = computed(() => {
    if (this.part().state.status !== 'completed') return '';
    const state = this.part().state as ToolStateCompleted;
    const diff = state.metadata['diff'];
    return typeof diff === 'string' ? diff : '';
  });

  protected readonly files = computed<CodeDiffFileMetadata[]>(() => {
    if (this.part().state.status !== 'completed') return [];
    const state = this.part().state as ToolStateCompleted;
    return this.extractFileMetadata(state.metadata['filediff']);
  });

  protected readonly totalAdditions = computed(() =>
    this.files().reduce((sum, f) => sum + f.additions, 0),
  );

  protected readonly totalDeletions = computed(() =>
    this.files().reduce((sum, f) => sum + f.deletions, 0),
  );

  private extractFileMetadata(value: unknown): CodeDiffFileMetadata[] {
    if (!value || typeof value !== 'object') {
      return [];
    }

    const filediff = value as Record<string, unknown>;
    const additions = typeof filediff['additions'] === 'number' ? filediff['additions'] : 0;
    const deletions = typeof filediff['deletions'] === 'number' ? filediff['deletions'] : 0;
    const filePath = typeof filediff['file'] === 'string' ? filediff['file'] : 'unknown';

    if (additions === 0 && deletions === 0) {
      return [];
    }

    return [{ relativePath: filePath, additions, deletions }];
  }
}
