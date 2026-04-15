import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ToolPart } from '@qos/opencode/data-access';
import { ToolPartShellComponent } from './tool-part-shell';

@Component({
  selector: 'tool-read',
  imports: [ToolPartShellComponent],
  template: `
    <tool-part-shell
      name="Read"
      [metadata]="metadata()"
      [status]="status()"
      [isCollapsible]="false"
      [state]="part().state"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolReadComponent {
  readonly part = input.required<ToolPart>();

  protected readonly status = computed(() => this.part().state.status);

  protected readonly metadata = computed(() => {
    const filePath = this.part().state.input['filePath'];
    return filePath ? `filePath=${filePath}` : '';
  });
}
