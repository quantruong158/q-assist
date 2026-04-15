import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ToolPart, ToolStateCompleted } from '@qos/opencode/data-access';
import stripAnsi from 'strip-ansi';
import { ToolPartShellComponent } from './tool-part-shell';

@Component({
  selector: 'tool-default',
  imports: [ToolPartShellComponent],
  template: `
    <tool-part-shell
      [name]="name()"
      [metadata]="''"
      [status]="status()"
      [isCollapsible]="isCollapsible()"
      [state]="part().state"
    >
      <div class="py-1 flex flex-col gap-1 pl-5">
        <pre class="whitespace-pre-wrap text-muted-foreground">{{ content() }}</pre>
      </div>
    </tool-part-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolDefaultComponent {
  readonly part = input.required<ToolPart>();

  protected readonly name = computed(() => this.part().tool);

  protected readonly status = computed(() => this.part().state.status);

  protected readonly isCollapsible = computed(
    () => this.part().state.status === 'completed' || this.part().state.status === 'error',
  );

  protected readonly content = computed(() => {
    const state = this.part().state;
    return state.status === 'completed' ? stripAnsi((state as ToolStateCompleted).output) : '';
  });
}
