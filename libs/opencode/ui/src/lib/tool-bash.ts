import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ToolPart, ToolStateCompleted } from '@qos/opencode/data-access';
import stripAnsi from 'strip-ansi';
import { ToolPartShellComponent } from './tool-part-shell';

@Component({
  selector: 'tool-bash',
  imports: [ToolPartShellComponent],
  template: `
    <tool-part-shell
      name="Bash"
      [metadata]="metadata()"
      [status]="status()"
      [isCollapsible]="true"
      [state]="part().state"
    >
      <div class="py-1 flex flex-col gap-1 pl-3 border rounded-md">
        <pre class="whitespace-pre-wrap">{{ content() }}</pre>
      </div>
    </tool-part-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolBashComponent {
  readonly part = input.required<ToolPart>();

  protected readonly status = computed(() => this.part().state.status);

  protected readonly metadata = computed(() => {
    const state = this.part().state;
    return state.status === 'completed' ? (state as ToolStateCompleted).title : '';
  });

  protected readonly content = computed(() => {
    const state = this.part().state;
    if (state.status === 'completed') {
      const completed = state as ToolStateCompleted;
      const hasOutput = completed.output.length > 0;
      return `> ${completed.input['command'] as string}${hasOutput ? `\n\n${stripAnsi(completed.output)}` : ''}`;
    }
    return `> ${state.input['command'] as string}`;
  });
}
