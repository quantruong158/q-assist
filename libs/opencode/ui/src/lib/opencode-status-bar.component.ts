import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { OpencodeStateStore } from '@qos/opencode/data-access';

@Component({
  selector: 'opencode-status-bar',
  imports: [HlmSpinnerImports, HlmButtonImports],
  template: `
    <div class="flex items-center gap-3 border-b border-border px-4 py-3 h-14">
      @switch (store.connectionState()) {
        @case ('connecting') {
          <hlm-spinner class="text-muted-foreground" />
          <span class="text-sm text-muted-foreground">Connecting to OpenCode server...</span>
        }
        @case ('connected') {
          <span class="h-2 w-2 rounded-full bg-green-500"></span>
          <span class="text-sm">Connected</span>
          @if (store.serverVersion()) {
            <span class="text-xs text-muted-foreground">v{{ store.serverVersion() }}</span>
          }
        }
        @case ('disconnected') {
          <span class="h-2 w-2 rounded-full bg-muted"></span>
          <span class="text-sm text-muted-foreground">Disconnected</span>
        }
        @case ('error') {
          <span class="h-2 w-2 rounded-full bg-red-500"></span>
          <span class="flex-1 text-sm text-red-500">{{ store.error() ?? 'Connection error' }}</span>
          <button hlmBtn size="sm" variant="ghost" (click)="retry.emit()">Retry</button>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeStatusBarComponent {
  protected readonly store = inject(OpencodeStateStore);
  readonly retry = output<void>();
}
