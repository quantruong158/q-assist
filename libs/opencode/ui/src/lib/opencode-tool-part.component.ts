import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeArrowRight01 } from '@ng-icons/huge-icons';
import { TitleCasePipe } from '@angular/common';
import type { ToolPart } from '@qos/opencode/data-access';
@Component({
  selector: 'opencode-tool-part',
  imports: [HlmBadgeImports, HlmCollapsibleImports, HlmButtonImports, NgIcon, TitleCasePipe],
  providers: [provideIcons({ hugeArrowRight01 })],
  template: `
    <div class="flex flex-col gap-1">
      <hlm-collapsible class="flex flex-col gap-2 group/collapsible">
        <div class="flex items-center gap-2">
          <span class="text-sm font-mono text-muted-foreground">{{ tool() | titlecase }}</span>
          <hlm-badge [variant]="statusVariant()" class="text-xs">{{
            status() | titlecase
          }}</hlm-badge>
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
        <div hlmCollapsibleContent>
          <div class="mt-2 flex flex-col gap-1 pl-4">
            @switch (status()) {
              @case ('running') {
                @if (title()) {
                  <p class="text-xs text-muted-foreground">{{ title() }}</p>
                } @else {
                  <p class="text-xs text-muted-foreground">Running...</p>
                }
              }
              @case ('pending') {
                <p class="text-xs text-muted-foreground">Pending...</p>
              }
              @case ('completed') {
                <p class="text-xs text-muted-foreground">Output</p>
                <pre class="whitespace-pre-wrap text-xs text-muted-foreground">{{ output() }}</pre>
              }
              @case ('error') {
                <p class="text-xs text-red-500">{{ error() }}</p>
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
  protected readonly statusVariant = computed(() => {
    switch (this.part().state.status) {
      case 'completed':
        return 'secondary';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  });
}
