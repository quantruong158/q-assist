import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ToolPart } from '@qos/opencode/data-access';
import { ToolPartShellComponent } from './tool-part-shell';

@Component({
  selector: 'tool-grep',
  imports: [ToolPartShellComponent],
  template: `
    <tool-part-shell
      name="Grep"
      [metadata]="metadata()"
      [status]="status()"
      [isCollapsible]="false"
      [state]="part().state"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolGrepComponent {
  readonly part = input.required<ToolPart>();

  protected readonly status = computed(() => this.part().state.status);

  protected readonly metadata = computed(() => {
    const part = this.part();
    const base = `pattern=${part.state.input['pattern']}`;
    if (part.state.status === 'completed') {
      return `${base} | Found ${part.state.metadata['matches']} matches`;
    }
    return base;
  });
}
