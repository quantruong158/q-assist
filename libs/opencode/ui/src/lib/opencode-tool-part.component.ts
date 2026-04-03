import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeArrowRight01 } from '@ng-icons/huge-icons';
import { TitleCasePipe } from '@angular/common';
import type { ToolPart, ToolStateCompleted } from '@qos/opencode/data-access';
@Component({
  selector: 'opencode-tool-part',
  imports: [HlmBadgeImports, HlmCollapsibleImports, HlmButtonImports, NgIcon, TitleCasePipe],
  providers: [provideIcons({ hugeArrowRight01 })],
  template: `
    <div class="flex flex-col gap-1">
      <hlm-collapsible class="flex flex-col gap-2 group/collapsible">
        <div class="flex items-center gap-2">
          <span class="text-sm text-foreground font-medium">{{ tool() | titlecase }}</span>
          @if (metadata() !== '') {
            <span class="text-xs text-muted-foreground">{{ metadata() }}</span>
          }
          @if (status() === 'error') {
            <hlm-badge variant="destructive" class="text-xs">{{ status() | titlecase }}</hlm-badge>
          }
          <button
            hlmCollapsibleTrigger
            hlmBtn
            variant="ghost"
            size="icon"
            class="size-6 rounded-full"
          >
            <ng-icon
              name="hugeArrowRight01"
              class="transition-transform duration-100 ease-out motion-reduce:transition-none group-data-[state=open]/collapsible:rotate-90"
            />
            <span class="sr-only">Toggle</span>
          </button>
        </div>
        <div
          hlmCollapsibleContent
          class="border-l-3"
          [class.border-destructive]="status() === 'error'"
        >
          <div class="py-1 flex flex-col gap-1 pl-3 text-sm">
            @switch (status()) {
              @case ('running') {
                @if (title()) {
                  <p class="text-muted-foreground">{{ title() }}</p>
                } @else {
                  <p class="text-muted-foreground">Running...</p>
                }
              }
              @case ('pending') {
                <p class="text-muted-foreground">Pending...</p>
              }
              @case ('completed') {
                <p class="text-muted-foreground">Output</p>
                <pre class="whitespace-pre-wrap text-muted-foreground">{{ output() }}</pre>
              }
              @case ('error') {
                <p class="text-red-500">{{ error() }}</p>
              }
            }
          </div>
        </div>
      </hlm-collapsible>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeToolPartComponent {
  readonly part = input.required<ToolPart>();

  protected readonly tool = computed(() => this.part().tool);

  protected readonly status = computed(() => this.part().state.status);

  protected readonly title = computed(() => {
    const state = this.part().state;
    return state.status === 'running' ? state.title : undefined;
  });

  protected readonly output = computed(() => {
    const state = this.part().state;
    return state.status === 'completed' ? state.output : '';
  });

  protected readonly error = computed(() => {
    const state = this.part().state;
    return state.status === 'error' ? state.error : '';
  });

  protected readonly metadata = computed(() => {
    switch (this.part().tool) {
      case 'glob':
        return `pattern=${this.part().state.input['pattern']}`;
      case 'grep':
        return `pattern=${this.part().state.input['pattern']}`;
      case 'read':
        return this.part().state.input['filePath'];
      case 'skill':
        return this.part().state.input['name'];
      case 'apply_patch':
        if (this.status() === 'completed') {
          const state = this.part().state as ToolStateCompleted;
          const files = state.metadata['files'] as Record<string, string>[];
          return files.length === 1 ? files[0]['relativePath'] : `${files.length} files`;
        }
        return '';
      case 'bash':
        if (this.status() === 'completed') {
          const state = this.part().state as ToolStateCompleted;
          return state.title;
        }
        return '';
      default:
        return '';
    }
  });
}
