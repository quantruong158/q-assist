import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ToolPart, ToolStateCompleted } from '@qos/opencode/data-access';
import { ToolPartShellComponent } from './tool-part-shell';
import { CodeDiffComponent } from './code-diff';

@Component({
  selector: 'tool-write',
  imports: [ToolPartShellComponent, CodeDiffComponent],
  template: `
    <tool-part-shell
      name="Write"
      [metadata]="metadata()"
      [status]="status()"
      [isCollapsible]="isCollapsible()"
      [state]="part().state"
    >
      @if (status() === 'completed') {
        <code-diff [content]="content()" [fileName]="fileName()" />
      }
    </tool-part-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolWriteComponent {
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
    if (status === 'completed') return this.content().length > 0;
    return status === 'error';
  });

  protected readonly fileName = computed(() => {
    const state = this.part().state;
    if (state.status === 'completed') {
      const filepath = (state as ToolStateCompleted).metadata['filepath'];
      return typeof filepath === 'string' ? filepath : '';
    }
    return typeof state.input['filePath'] === 'string' ? (state.input['filePath'] as string) : '';
  });

  protected readonly content = computed(() => {
    const state = this.part().state;
    if (state.status !== 'completed') return '';
    return typeof state.input['content'] === 'string' ? (state.input['content'] as string) : '';
  });
}
