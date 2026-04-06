import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeArrowRight01, hugeCancelCircle } from '@ng-icons/huge-icons';
import type { ToolPart, ToolStateCompleted } from '@qos/opencode/data-access';
import stripAnsi from 'strip-ansi';

interface ToolDisplayValue {
  name: string;
  metadata: string;
  collapsibleContent: string;
}

@Component({
  selector: 'opencode-tool-part',
  imports: [HlmBadgeImports, HlmCollapsibleImports, HlmButtonImports, NgIcon],
  providers: [provideIcons({ hugeArrowRight01, hugeCancelCircle })],
  template: `
    <div class="flex flex-col gap-1">
      <hlm-collapsible class="flex flex-col gap-2 group/collapsible">
        <div class="flex items-center gap-2">
          <span class="text-sm text-foreground font-medium">{{ toolDisplayValue().name }}</span>
          @if (toolDisplayValue().metadata !== '') {
            <span class="text-xs text-muted-foreground">{{ toolDisplayValue().metadata }}</span>
          }
          @if (status() === 'error') {
            <ng-icon name="hugeCancelCircle" class="text-destructive" size="20" strokeWidth="1.5" />
          }
          <button
            hlmCollapsibleTrigger
            hlmBtn
            variant="ghost"
            size="icon"
            class="size-6 rounded-full"
            [class.hidden]="!isCollapsible()"
          >
            <ng-icon
              name="hugeArrowRight01"
              class="transition-transform duration-100 ease-out motion-reduce:transition-none group-data-[state=open]/collapsible:rotate-90"
            />
            <span class="sr-only">Toggle</span>
          </button>
        </div>
        @if (isCollapsible()) {
          <div
            hlmCollapsibleContent
            class="border-l-3 text-xs"
            [class.border-destructive]="status() === 'error'"
          >
            <div class="py-1 flex flex-col gap-1 pl-5">
              <pre class="whitespace-pre-wrap text-muted-foreground">{{
                toolDisplayValue().collapsibleContent
              }}</pre>
            </div>
          </div>
        }
      </hlm-collapsible>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeToolPartComponent {
  readonly part = input.required<ToolPart>();

  protected readonly tool = computed(() => this.part().tool);

  protected readonly status = computed(() => this.part().state.status);

  protected readonly toolDisplayValue = computed<ToolDisplayValue>(() => {
    const part = this.part();
    const tool = part.tool;
    switch (tool) {
      case 'glob':
        return {
          name: 'Glob',
          metadata: `pattern=${part.state.input['pattern']}${part.state.status === 'completed' ? ' | Found ' + part.state.metadata['count'] + ' matches' : ''}`,
          collapsibleContent: '',
        };
      case 'grep':
        return {
          name: 'Grep',
          metadata: `pattern=${part.state.input['pattern']}${part.state.status === 'completed' ? ' | Found ' + part.state.metadata['matches'] + ' matches' : ''}`,
          collapsibleContent: '',
        };
      case 'read':
        return {
          name: 'Read',
          metadata: `filePath=${part.state.input['filePath']}`,
          collapsibleContent: '',
        };
      case 'edit':
        return {
          name: 'Edit',
          metadata: `${
            part.state.status !== 'pending' && part.state.status !== 'error' ? part.state.title : ''
          }`,
          collapsibleContent: part.state.status === 'error' ? part.state.error : '',
        };
      case 'skill':
        return {
          name: 'Skill',
          metadata: `name=${part.state.input['name']}`,
          collapsibleContent: part.state.status === 'completed' ? stripAnsi(part.state.output) : '',
        };
      case 'apply_patch':
        return {
          name: 'Apply Patch',
          metadata: '',
          collapsibleContent:
            part.state.status === 'completed'
              ? (() => {
                  if (this.status() === 'completed') {
                    const state = part.state as ToolStateCompleted;
                    const files = state.metadata['files'] as Record<string, string>[];
                    return files.length === 1 ? files[0]['relativePath'] : `${files.length} files`;
                  }
                  return '';
                })()
              : '',
        };
      case 'bash':
        return {
          name: 'Bash',
          metadata: part.state.status === 'completed' ? part.state.title : '',
          collapsibleContent:
            part.state.status === 'completed'
              ? (() => {
                  const state = part.state as ToolStateCompleted;
                  const hasOutput = state.output.length > 0;
                  return `> ${state.input['command'] as string}${hasOutput ? `\n\n${stripAnsi(state.output)}` : ''}`;
                })()
              : `> ${part.state.input['command'] as string}`,
        };
      default:
        return {
          name: tool,
          metadata: '',
          collapsibleContent: part.state.status === 'completed' ? stripAnsi(part.state.output) : '',
        };
    }
  });

  protected readonly isCollapsible = computed(() => {
    return this.toolDisplayValue().collapsibleContent.length > 0;
  });
}
