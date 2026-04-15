import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ToolPart } from '@qos/opencode/data-access';
import { ToolPartShellComponent } from './tool-part-shell';

@Component({
  selector: 'tool-glob',
  imports: [ToolPartShellComponent],
  template: `
    <tool-part-shell
      name="Glob"
      [metadata]="metadata()"
      [status]="status()"
      [isCollapsible]="false"
      [state]="part().state"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolGlobComponent {
  readonly part = input.required<ToolPart>();

  protected readonly status = computed(() => this.part().state.status);

  protected readonly metadata = computed(() => {
    const part = this.part();
    const base = `pattern=${part.state.input['pattern']}`;
    if (part.state.status === 'completed') {
      return `${base} | Found ${part.state.metadata['count']} matches`;
    }
    return base;
  });
}
