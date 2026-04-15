import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass } from '@angular/common';
import { HlmCollapsibleImports } from '@spartan-ng/helm/collapsible';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeArrowRight01, hugeCancelCircle } from '@ng-icons/huge-icons';
import type { ToolState } from '@qos/opencode/data-access';

@Component({
  selector: 'tool-part-shell',
  imports: [NgClass, HlmCollapsibleImports, HlmButtonImports, NgIcon],
  providers: [provideIcons({ hugeArrowRight01, hugeCancelCircle })],
  template: `
    <div class="flex flex-col gap-1">
      <hlm-collapsible class="flex flex-col gap-2 group/collapsible">
        <div class="flex items-center gap-2 min-h-6 font-medium">
          <span
            class="text-sm text-foreground"
            [ngClass]="{
              'shimmer shimmer-spread-150 shimmer-repeat-delay-200 shimmer-duration-1000':
                status() === 'pending' || status() === 'running',
            }"
            >{{ name() }}</span
          >
          @if (metadata().length > 0) {
            <span
              class="box-border text-xs text-muted-foreground whitespace-pre-wrap wrap-break-word truncate"
              >{{ metadata() }}</span
            >
          }
          @if (isError()) {
            <ng-icon
              name="hugeCancelCircle"
              class="text-destructive shrink-0"
              size="20"
              strokeWidth="1.5"
            />
          }
          <ng-content select="[stats]" />
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
          <div hlmCollapsibleContent class="text-xs" [class.border-destructive]="isError()">
            @if (isError() && error()) {
              <div class="py-1 flex flex-col gap-1 pl-5 border-l-2 border-destructive">
                <pre class="whitespace-pre-wrap text-destructive">{{ error() }}</pre>
              </div>
            } @else {
              <ng-content />
            }
          </div>
        }
      </hlm-collapsible>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolPartShellComponent {
  readonly name = input.required<string>();
  readonly metadata = input('');
  readonly status = input.required<'pending' | 'running' | 'completed' | 'error'>();
  readonly isCollapsible = input.required<boolean>();
  readonly state = input.required<ToolState>();

  protected readonly isError = computed(() => this.status() === 'error');

  protected readonly error = computed(() => {
    const state = this.state();
    if (state.status === 'error') {
      return state.error;
    }

    return undefined;
  });
}
