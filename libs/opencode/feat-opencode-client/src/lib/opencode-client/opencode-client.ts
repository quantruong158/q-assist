import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { KeyValuePipe, NgTemplateOutlet } from '@angular/common';
import { TextFieldModule } from '@angular/cdk/text-field';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeArrowDown02, hugeArrowUp02 } from '@ng-icons/huge-icons';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { OpencodeClientService, OpencodeModel } from '@qos/opencode/data-access';
import { OpencodeEventService } from '@qos/opencode/data-access';
import { OpencodeStateStore } from '@qos/opencode/data-access';
import { OpencodeMessageListComponent } from '@qos/opencode/ui';
import { OpencodeSessionRailComponent } from '@qos/opencode/ui';
import { OpencodeStatusBarComponent } from '@qos/opencode/ui';
import { CdkScrollable, ScrollDispatcher } from '@angular/cdk/scrolling';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

const MAX_BOTTOM_OFFSET = 10;

@Component({
  selector: 'opencode-client',
  imports: [
    ReactiveFormsModule,
    TextFieldModule,
    BrnSelectImports,
    HlmButtonImports,
    HlmIconImports,
    HlmInputGroupImports,
    HlmSelectImports,
    HlmSpinnerImports,
    KeyValuePipe,
    NgIcon,
    NgTemplateOutlet,
    OpencodeStatusBarComponent,
    OpencodeSessionRailComponent,
    OpencodeMessageListComponent,
    CdkScrollable,
  ],
  providers: [
    provideIcons({
      hugeArrowUp02,
      hugeArrowDown02,
    }),
  ],
  templateUrl: './opencode-client.html',
  styles: `
    .scroll-down-button-enter {
      animation: scroll-down-button-enter 200ms cubic-bezier(0.23, 1, 0.32, 1);
    }

    .scroll-down-button-leave {
      animation: scroll-down-button-leave 120ms cubic-bezier(0.32, 0.72, 0, 1);
    }

    @keyframes scroll-down-button-enter {
      from {
        opacity: 0.01;
        transform: translateY(18px) scale(0.98);
        filter: blur(8px);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }

    @keyframes scroll-down-button-leave {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }

      to {
        opacity: 0;
        transform: translateY(12px) scale(0.985);
        filter: blur(6px);
      }
    }
  `,
  host: { class: 'flex-1 overflow-y-auto' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeClient implements OnInit {
  readonly clientService = inject(OpencodeClientService);
  readonly store = inject(OpencodeStateStore);
  private readonly eventService = inject(OpencodeEventService);
  private readonly destroyRef = inject(DestroyRef);
  private scrollDispatcher = inject(ScrollDispatcher);

  private readonly scrollContainer = viewChild(CdkScrollable);

  protected readonly promptControl = new FormControl('');
  protected readonly selectedModelControl = new FormControl<OpencodeModel | null>(null);
  protected readonly models = signal<Partial<Record<string, OpencodeModel[]>>>({});

  protected readonly isAtBottom = toSignal(
    this.scrollDispatcher.scrolled().pipe(
      filter((scrollable) => scrollable === this.scrollContainer()),
      map((scrollable) => {
        return (scrollable as CdkScrollable).measureScrollOffset('bottom') <= MAX_BOTTOM_OFFSET;
      }),
    ),
    { initialValue: false },
  );

  protected readonly isScrollable = toSignal(
    this.scrollDispatcher.scrolled().pipe(
      filter((scrollable) => scrollable === this.scrollContainer()),
      map((scrollable) => {
        const instance = scrollable as CdkScrollable;
        const element = instance.getElementRef().nativeElement;
        return element.scrollHeight > element.clientHeight;
      }),
    ),
    { initialValue: false },
  );

  constructor() {
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

  protected scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.scrollContainer()?.scrollTo({
        bottom: 0,
      });
    });
  }

  private async loadInitialData(): Promise<void> {
    try {
      const [health, sessions, statusMap, providers] = await Promise.all([
        this.clientService.checkHealth(),
        this.clientService.listSessions(),
        this.clientService.getAllSessionStatus(),
        this.clientService.getProviders(),
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

      this.models.set(providers);

      const firstProvider = Object.values(providers)[0];
      const firstModel = firstProvider?.[0] ?? null;
      this.selectedModelControl.setValue(firstModel);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      this.store.setConnectionState('error');
      this.store.setError('Failed to connect to OpenCode server');
    }
  }

  protected onNewSession(): void {
    this.store.setActiveSession(null);
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

      this.scrollToBottom();
    } catch (err) {
      console.error('Failed to load session details:', err);
    }
  }
  protected onRetry(): void {
    this.eventService.cancel();
    this.store.setConnectionState('connecting');
    void this.loadInitialData();
    this.eventService.subscribe();
  }

  protected canSend(): boolean {
    const text = this.promptControl.value?.trim();
    return !!text && !this.store.isStreaming();
  }

  protected compareModels = (a: OpencodeModel, b: OpencodeModel): boolean => {
    return a?.id === b?.id;
  };

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendPrompt();
    }
  }

  protected async sendPrompt(): Promise<void> {
    const text = this.promptControl.value?.trim();
    if (!text) return;
    if (this.store.isStreaming()) return;

    let sessionId = this.store.activeSessionId();

    if (!sessionId) {
      const session = await this.clientService.createSession();
      if (!session) {
        console.error('Failed to create session');
        return;
      }
      this.store.upsertSession(session);
      sessionId = session.id;
      this.store.setActiveSession(sessionId);
    }

    const selectedModel = this.selectedModelControl.value;
    const model = selectedModel
      ? {
          providerID: selectedModel.providerId,
          modelID: selectedModel.id,
        }
      : undefined;

    this.promptControl.setValue('');
    try {
      await this.clientService.promptSession(sessionId, text, model);
    } catch (err) {
      console.error('Failed to send prompt:', err);
      this.promptControl.setValue(text);
    }
  }
}
