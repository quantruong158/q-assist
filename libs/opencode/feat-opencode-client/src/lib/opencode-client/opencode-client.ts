import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
} from '@angular/core';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { OpencodeClientService } from '@qos/opencode/data-access';
import { OpencodeEventService } from '@qos/opencode/data-access';
import { OpencodeStateStore } from '@qos/opencode/data-access';
import { OpencodeMessageListComponent } from '@qos/opencode/ui';
import { OpencodeSessionRailComponent } from '@qos/opencode/ui';
import { OpencodeStatusBarComponent } from '@qos/opencode/ui';

@Component({
  selector: 'opencode-client',
  imports: [
    HlmSpinnerImports,
    OpencodeStatusBarComponent,
    OpencodeSessionRailComponent,
    OpencodeMessageListComponent,
  ],
  template: `
    <div class="flex h-full flex-col bg-background">
      <opencode-status-bar (retry)="onRetry()" />
      <div class="flex flex-1 overflow-hidden">
        <opencode-session-rail (select)="onSelectSession($event)" (refresh)="onRefreshSessions()" />
        <main class="flex flex-1 flex-col overflow-y-auto">
          @if (!store.activeSession()) {
            <div class="flex flex-1 flex-col items-center justify-center text-muted-foreground">
              @if (store.isLoading()) {
                <hlm-spinner class="mb-4 text-2xl" />
                <p class="text-sm">Loading sessions...</p>
              } @else if (store.connectionState() === 'error') {
                <p class="text-sm">Unable to connect to OpenCode server</p>
                <p class="mt-1 text-xs">
                  Make sure OpenCode is running at {{ clientService.getBaseUrl() }}
                </p>
              } @else {
                <p class="text-sm">Select a session to view its timeline</p>
              }
            </div>
          } @else {
            <div
              class="flex flex-1 flex-col overflow-x-hidden overflow-y-scroll pb-[calc(220px+var(--safe-area-bottom))] max-[600px]:pb-[calc(190px+var(--safe-area-bottom))]"
            >
              <opencode-message-list />
            </div>
          }
        </main>
      </div>
    </div>
  `,
  host: { class: 'flex-1 overflow-y-auto' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeClient implements OnInit {
  readonly clientService = inject(OpencodeClientService);
  readonly store = inject(OpencodeStateStore);
  private readonly eventService = inject(OpencodeEventService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const list = this.store.sessionList();
      if (list.length > 0 && !this.store.activeSessionId()) {
        const sorted = [...list].sort((a, b) => b.time.updated - a.time.updated);
        this.store.setActiveSession(sorted[0].id);
      }
    });

    effect(() => {
      const sessionId = this.store.activeSessionId();
      if (sessionId) {
        void this.loadSessionDetails(sessionId);
      }
    });
  }

  ngOnInit(): void {
    this.store.setConnectionState('connecting');
    void this.loadInitialData();
    this.eventService.subscribe();
    this.destroyRef.onDestroy(() => this.eventService.cancel());
  }

  private async loadInitialData(): Promise<void> {
    this.store.setLoading(true);
    try {
      const [health, sessions, statusMap] = await Promise.all([
        this.clientService.checkHealth(),
        this.clientService.listSessions(),
        this.clientService.getAllSessionStatus(),
      ]);
      if (!health.healthy) {
        this.store.setConnectionState('error');
        this.store.setError('OpenCode server is not healthy');
        return;
      }
      this.store.setConnectionState('connected', health.version);
      this.store.setSessions(sessions);
      for (const [sessionId, status] of Object.entries(statusMap))
        this.store.setSessionStatus(sessionId, status);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      this.store.setConnectionState('error');
      this.store.setError('Failed to connect to OpenCode server');
    } finally {
      this.store.setLoading(false);
    }
  }

  protected async onSelectSession(sessionId: string): Promise<void> {
    this.store.setActiveSession(sessionId);
  }

  private async loadSessionDetails(sessionId: string): Promise<void> {
    try {
      const [session, messages] = await Promise.all([
        this.clientService.getSession(sessionId),
        this.clientService.getSessionMessages(sessionId),
      ]);

      if (session) {
        this.store.upsertSession(session);
      }

      for (const { info: message, parts } of messages) {
        this.store.upsertMessage(message);
        for (const part of parts) {
          this.store.upsertPart(part);
        }
      }
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  }
  protected async onRefreshSessions(): Promise<void> {
    this.store.setLoading(true);
    try {
      this.store.setSessions(await this.clientService.listSessions());
    } finally {
      this.store.setLoading(false);
    }
  }
  protected onRetry(): void {
    this.eventService.cancel();
    this.store.setConnectionState('connecting');
    void this.loadInitialData();
    this.eventService.subscribe();
  }
}
