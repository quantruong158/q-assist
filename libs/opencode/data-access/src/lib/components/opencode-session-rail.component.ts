import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { OpencodeStateStore } from '../opencode-state.store';
import type { SessionStatus } from '../opencode.types';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeArrowReloadHorizontal } from '@ng-icons/huge-icons';

@Component({
  selector: 'opencode-session-rail',
  imports: [DatePipe, HlmBadgeImports, HlmButtonImports, NgIcon],
  providers: [provideIcons({ hugeArrowReloadHorizontal })],
  template: `
    <aside class="flex w-64 flex-col border-r border-border h-full">
      <div class="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 class="text-sm font-medium">Sessions</h2>
        <button hlmBtn size="icon" variant="ghost" (click)="refresh.emit()" class="rounded-full">
          <ng-icon name="hugeArrowReloadHorizontal" />
        </button>
      </div>

      <div class="flex-1 overflow-y-auto w-full">
        @if (store.sessionList().length === 0) {
          <div
            class="flex flex-col items-center justify-center p-8 text-center text-muted-foreground"
          >
            <p class="text-sm font-medium">No sessions</p>
            <p class="mt-1 text-xs">Sessions will appear here when available</p>
          </div>
        } @else {
          @for (session of store.sessionList(); track session.id) {
            <button
              class="flex w-full flex-col items-start gap-1 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
              [class.bg-muted]="store.activeSessionId() === session.id"
              (click)="select.emit(session.id)"
            >
              <span class="truncate text-sm font-medium w-full">{{
                session.title || 'Untitled'
              }}</span>
              <div class="flex w-full items-center gap-2">
                <span class="text-xs text-muted-foreground">
                  {{ session.time.updated | date: 'short' }}
                </span>
                @if (getStatus(session.id); as status) {
                  @if (status.type === 'busy') {
                    <hlm-badge variant="outline" class="text-xs">Busy</hlm-badge>
                  } @else if (status.type === 'retry') {
                    <hlm-badge variant="outline" class="text-xs">Retry</hlm-badge>
                  }
                }
              </div>
            </button>
          }
        }
      </div>
    </aside>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeSessionRailComponent {
  readonly store = inject(OpencodeStateStore);
  readonly select = output<string>();
  readonly refresh = output<void>();

  getStatus(sessionId: string): SessionStatus | null {
    return this.store.sessionStatus()[sessionId] ?? null;
  }
}
