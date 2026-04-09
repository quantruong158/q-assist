import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeAdd01, hugeDelete02 } from '@ng-icons/huge-icons';
import { OpencodeStateStore } from '@qos/opencode/data-access';
import type { SessionStatus } from '@qos/opencode/data-access';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'opencode-session-rail',
  imports: [DatePipe, HlmBadgeImports, HlmButtonImports, NgIcon, HlmTooltipImports, CommonModule],
  providers: [provideIcons({ hugeAdd01, hugeDelete02 })],
  template: `
    <aside class="flex w-56 flex-col border-r border-border h-full">
      <div class="flex items-center justify-between border-b border-border px-4 py-3 h-14">
        <h2 class="text-sm font-medium">Sessions</h2>
        <button hlmBtn variant="ghost" (click)="newSession.emit()" class="rounded-full px-3 gap-2">
          <ng-icon name="hugeAdd01" size="18px" />
          <span class="text-xs">New</span>
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
              class="group flex w-full items-center gap-2 border-b px-4 py-3 text-left transition-colors hover:bg-muted/80"
              [class.bg-muted]="store.activeSessionId() === session.id"
              [ngClass]="{
                'shimmer shimmer-bg shimmer-repeat-delay-0 shimmer-duration-1500 shimmer-color-[color-mix(in_oklab,var(--primary)_20%,transparent)]':
                  getStatus(session.id)?.type === 'busy',
              }"
              (click)="select.emit(session.id)"
            >
              <div class="flex min-w-0 flex-1 flex-col items-start gap-2">
                <span class="truncate text-sm font-medium w-full">{{
                  session.title || 'Untitled'
                }}</span>
                <div class="flex flex-1 w-full items-center gap-2">
                  <span class="text-xs text-muted-foreground">{{
                    session.time.updated | date: 'short'
                  }}</span>
                </div>
              </div>
              <button
                hlmBtn
                size="icon"
                variant="ghost"
                class="hidden group-hover:flex"
                hlmTooltip="Archive session"
                [showDelay]="300"
                (click)="removeSession.emit(session.id); $event.stopPropagation()"
              >
                <ng-icon name="hugeDelete02" />
              </button>
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
  readonly newSession = output<void>();
  readonly removeSession = output<string>();

  protected getStatus(sessionId: string): SessionStatus | null {
    return this.store.sessionStatus()[sessionId] ?? null;
  }
}
