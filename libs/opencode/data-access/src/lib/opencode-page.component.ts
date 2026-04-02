import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
} from '@angular/core';
import { HlmBadgeImports } from '@spartan-ng/helm/badge';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { OpencodeClientService } from './opencode-client.service';
import { OpencodeEventService } from './opencode-event.service';
import { OpencodeStateStore } from './opencode-state.store';
import { OpencodeStatusBarComponent } from './components/opencode-status-bar.component';
import { OpencodeSessionRailComponent } from './components/opencode-session-rail.component';
import { OpencodeMessageListComponent } from './components/opencode-message-list.component';

@Component({
  selector: 'opencode-page',
  imports: [
    HlmBadgeImports,
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

        <main class="flex flex-1 flex-col overflow-y-scroll overflow-x-hidden">
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
              class="flex items-center gap-3 border-b border-border px-4 py-3 sticky top-0 bg-background z-10"
            >
              <h1 class="truncate text-base font-medium">
                {{ store.activeSession()?.title || 'Untitled' }}
              </h1>
              @if (store.activeSessionStatus().type === 'busy') {
                <hlm-badge variant="default" class="bg-blue-500">Streaming</hlm-badge>
              } @else if (store.activeSessionStatus().type === 'idle') {
                <hlm-badge variant="secondary" class="text-xs">Idle</hlm-badge>
              }
            </div>

            <opencode-message-list />
          }
        </main>
      </div>
    </div>
  `,
  host: {
    class: 'flex-1 overflow-y-auto',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodePage implements OnInit {
  readonly clientService = inject(OpencodeClientService);
  readonly store = inject(OpencodeStateStore);
  private readonly eventService = inject(OpencodeEventService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(
      () => {
        const list = this.store.sessionList();
        if (list.length > 0 && !this.store.activeSessionId()) {
          const sorted = [...list].sort((a, b) => b.time.updated - a.time.updated);
          this.store.setActiveSession(sorted[0].id);
        }
      },
      { allowSignalWrites: true },
    );
  }

  ngOnInit(): void {
    this.store.setConnectionState('connecting');
    void this.loadInitialData();
    void this.eventService.subscribe();

    this.destroyRef.onDestroy(() => {
      this.eventService.cancel();
    });
  }

  private async loadInitialData(): Promise<void> {
    this.store.setLoading(true);
    try {
      const [health, sessions, statusMap] = await Promise.all([
        this.clientService.checkHealth(),
        this.clientService.listSessions(),
        this.clientService.getAllSessionStatus(),
      ]);

      if (health.healthy) {
        this.store.setConnectionState('connected', health.version);
      } else {
        this.store.setConnectionState('error');
        this.store.setError('OpenCode server is not healthy');
        return;
      }

      this.store.setSessions(sessions);

      for (const [sessionId, status] of Object.entries(statusMap)) {
        this.store.setSessionStatus(sessionId, status);
      }

      const sessionList = this.store.sessionList();
      if (sessionList.length > 0 && !this.store.activeSessionId()) {
        const sorted = [...sessionList].sort((a, b) => b.time.updated - a.time.updated);
        await this.loadSessionDetails(sorted[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
      this.store.setConnectionState('error');
      this.store.setError('Failed to connect to OpenCode server');
    } finally {
      this.store.setLoading(false);
    }
  }

  async onSelectSession(sessionId: string): Promise<void> {
    this.store.setActiveSession(sessionId);
    await this.loadSessionDetails(sessionId);
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

  async onRefreshSessions(): Promise<void> {
    this.store.setLoading(true);
    try {
      const sessions = await this.clientService.listSessions();
      this.store.setSessions(sessions);
    } catch (err) {
      console.error('Failed to refresh sessions:', err);
    } finally {
      this.store.setLoading(false);
    }
  }

  async onRetry(): Promise<void> {
    this.eventService.cancel();
    this.store.setConnectionState('connecting');
    await this.loadInitialData();
    await this.eventService.subscribe();
  }
}
