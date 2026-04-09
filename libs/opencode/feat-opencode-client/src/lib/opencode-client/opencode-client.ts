import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
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
import {
  hugeArrowDown02,
  hugeArrowUp02,
  hugeFile01,
  hugeFolder01,
  hugeStop,
} from '@ng-icons/huge-icons';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { OpencodeClientService, OpencodeModel } from '@qos/opencode/data-access';
import type { FilePartInput, OpencodeAgent, OpencodeCommand } from '@qos/opencode/data-access';
import { OpencodeEventService } from '@qos/opencode/data-access';
import { OpencodeStateStore } from '@qos/opencode/data-access';
import { OpencodeMessageListComponent } from '@qos/opencode/ui';
import { OpencodeSessionRailComponent } from '@qos/opencode/ui';
import { OpencodeStatusBarComponent } from '@qos/opencode/ui';
import { CdkScrollable, ScrollDispatcher } from '@angular/cdk/scrolling';
import { ObserversModule } from '@angular/cdk/observers';
import { asyncScheduler, filter, map, throttleTime } from 'rxjs';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { toast } from 'ngx-sonner';
import { TitleCasePipe } from '@angular/common';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { getTokenRangeAtCursor, findTokenOccurrences, toFileUrl } from '@qos/shared/util-angular';

const MAX_BOTTOM_OFFSET = 200;

export interface AutocompleteItem {
  id: string;
  label: string;
  kind?: 'file' | 'directory';
  description?: string;
  icon?: string;
}

interface SelectedFileReference {
  id: string;
  token: string;
  filename: string;
  mime: string;
  url: string;
  path: string;
  start: number;
  end: number;
}

interface PromptSegment {
  text: string;
  highlighted: boolean;
}

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
    ObserversModule,
    TitleCasePipe,
    HlmTooltipImports,
  ],
  providers: [
    provideIcons({
      hugeArrowUp02,
      hugeArrowDown02,
      hugeStop,
      hugeFile01,
      hugeFolder01,
    }),
  ],
  templateUrl: './opencode-client.html',
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

  private readonly promptInput = viewChild.required<ElementRef<HTMLTextAreaElement>>('promptInput');

  protected readonly promptControl = new FormControl('');
  protected readonly selectedModelControl = new FormControl<OpencodeModel | null>(null);
  protected readonly providers = signal<Partial<Record<string, OpencodeModel[]>>>({});
  protected readonly selectedAgentControl = new FormControl<OpencodeAgent | null>(null);
  protected readonly agents = signal<OpencodeAgent[]>([]);
  protected readonly selectedVariantControl = new FormControl<string | undefined>(undefined, {
    nonNullable: true,
  });
  protected readonly commands = signal<OpencodeCommand[]>([]);

  protected readonly autocompleteState = signal<{
    visible: boolean;
    type: 'file' | 'command' | null;
  }>({ visible: false, type: null });

  protected readonly autocompleteItems = signal<AutocompleteItem[]>([]);
  protected readonly highlightedAutocompleteIndex = signal(0);
  private readonly autocompleteList = viewChild<ElementRef<HTMLDivElement>>('autocompleteList');
  private readonly activeFileAutocomplete = signal<{
    start: number;
    end: number;
    query: string;
  } | null>(null);
  private readonly activeCommandAutocomplete = signal<{
    start: number;
    end: number;
    query: string;
  } | null>(null);
  private readonly selectedFileReferences = signal<SelectedFileReference[]>([]);

  protected readonly highlightedPromptSegments = computed<PromptSegment[]>(() => {
    const text = this.promptValue() ?? '';
    if (!text) return [];

    const refs = this.selectedFileReferences();
    if (refs.length === 0) {
      return [{ text, highlighted: false }];
    }

    const sorted = [...refs].sort((a, b) => a.start - b.start);
    const segments: PromptSegment[] = [];
    let lastEnd = 0;

    for (const ref of sorted) {
      const safeStart = Math.max(0, Math.min(ref.start, text.length));
      const safeEnd = Math.max(safeStart, Math.min(ref.end, text.length));
      if (safeStart < lastEnd) continue;

      if (safeStart > lastEnd) {
        segments.push({
          text: text.substring(lastEnd, safeStart),
          highlighted: false,
        });
      }

      segments.push({
        text: text.substring(safeStart, safeEnd),
        highlighted: true,
      });
      lastEnd = safeEnd;
    }

    if (lastEnd < text.length) {
      segments.push({
        text: text.substring(lastEnd),
        highlighted: false,
      });
    }

    return segments;
  });

  private readonly promptScrollTop = signal(0);
  private readonly promptScrollLeft = signal(0);

  private readonly shouldStickToBottom = signal(false);
  private readonly scrollMutationVersion = signal(0);

  private readonly throttledScrollMutationVersion = toSignal(
    toObservable(this.scrollMutationVersion).pipe(
      throttleTime(50, asyncScheduler, {
        leading: true,
        trailing: true,
      }),
    ),
    { initialValue: 0 },
  );

  protected readonly promptOverlayTransform = computed(
    () => `translate(${-this.promptScrollLeft()}px, ${-this.promptScrollTop()}px)`,
  );

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

  protected readonly promptValue = toSignal(this.promptControl.valueChanges, { initialValue: '' });

  protected readonly selectedModel = toSignal(this.selectedModelControl.valueChanges, {
    initialValue: null,
  });

  protected readonly variants = computed(() => {
    const model = this.selectedModel();
    const variants = Object.keys(model?.variants ?? {});

    return variants;
  });

  protected canSend = computed(() => {
    const text = this.promptValue()?.trim();
    return !!text && !this.store.isStreaming();
  });

  constructor() {
    effect(() => {
      const sessionId = this.store.activeSessionId();
      if (sessionId) {
        void this.loadSessionDetails(sessionId);
      }
    });

    effect(() => {
      const providers = this.providers();
      if (providers) {
        const firstProvider = Object.values(providers)[0];
        if (firstProvider && firstProvider[0]) {
          this.selectedModelControl.setValue(firstProvider[0]);
        }
      }
    });

    effect(() => {
      if (this.variants()) {
        this.selectedVariantControl.setValue(undefined);
      }
    });

    effect(() => {
      const isStreaming = this.store.isStreaming();
      const isAtBottom = this.isAtBottom();

      if (!isStreaming) {
        this.shouldStickToBottom.set(false);
        return;
      }

      if (isAtBottom) {
        this.shouldStickToBottom.set(true);
      } else if (this.shouldStickToBottom()) {
        this.shouldStickToBottom.set(false);
      }
    });

    effect(() => {
      const version = this.throttledScrollMutationVersion();
      if (version === 0) return;

      if (this.store.isStreaming() && this.shouldStickToBottom()) {
        this.scrollToBottom();
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
      const [health, sessions, statusMap, providers, agents, commands, currentPath] =
        await Promise.all([
          this.clientService.checkHealth(),
          this.clientService.listSessions(),
          this.clientService.getAllSessionStatus(),
          this.clientService.getProviders(),
          this.clientService.listAgents(),
          this.clientService.listCommands(),
          this.clientService.getCurrentPath(),
        ]);

      if (!health.healthy) {
        this.store.setConnectionState('error');
        this.store.setError('OpenCode server is not healthy');
        return;
      }
      this.store.setCurrentPath(currentPath);
      this.store.setConnectionState('connected', health.version);
      this.store.setSessions(sessions);
      for (const [sessionId, status] of Object.entries(statusMap))
        this.store.setSessionStatus(sessionId, status);

      this.providers.set(providers);

      const firstProvider = Object.values(providers)[0];
      const firstModel = firstProvider?.[0] ?? null;
      this.selectedModelControl.setValue(firstModel);

      this.agents.set(agents);
      const firstAgent = agents[0] ?? null;
      this.selectedAgentControl.setValue(firstAgent);

      this.commands.set(commands);
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

  private async loadFileAutocomplete(query: string): Promise<void> {
    try {
      const files = await this.clientService.searchFiles(query);
      this.autocompleteItems.set(
        files
          .map((f) => ({
            id: f.url,
            label: f.name,
            kind: f.type,
            icon: f.type === 'directory' ? 'hugeFolder01' : 'hugeFile01',
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
    } catch {
      this.autocompleteItems.set([]);
    }
  }

  private async loadCommandAutocomplete(query: string): Promise<void> {
    const commands = this.commands();
    const q = query.toLowerCase();
    this.autocompleteItems.set(
      commands
        .filter((c) => c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
        .map((c) => ({
          id: c.name,
          label: `/${c.name}`,
          description: c.description ?? '',
        })),
    );
  }

  protected onAutocompleteSelect(item: AutocompleteItem): void {
    const state = this.autocompleteState();
    if (!state.visible) return;

    const textarea = this.promptInput().nativeElement;
    const text = textarea.value ?? '';

    let newText: string;
    let newCursorPos: number;

    if (state.type === 'file') {
      const active = this.activeFileAutocomplete();
      if (!active) {
        this.autocompleteState.update((s) => ({ ...s, visible: false }));
        return;
      }

      const token = `@${item.label}`;
      newText = text.substring(0, active.start) + token + ' ' + text.substring(active.end);
      const tokenStart = active.start;
      const tokenEnd = tokenStart + token.length;
      newCursorPos = tokenEnd + 1;

      const currentPath = this.store.currentPath()?.directory ?? '/';
      const path = this.toAbsolutePath(currentPath, item.id);

      this.selectedFileReferences.update((refs) => {
        const nextRefs = refs.filter((ref) => !(ref.start < active.end && ref.end > active.start));
        nextRefs.push({
          id: crypto.randomUUID(),
          token,
          filename: item.label,
          mime:
            item.kind === 'directory' || item.label.endsWith('/')
              ? 'application/x-directory'
              : 'text/plain',
          url: toFileUrl(path),
          path,
          start: tokenStart,
          end: tokenEnd,
        });
        return nextRefs.sort((a, b) => a.start - b.start);
      });

      this.activeFileAutocomplete.set(null);
    } else if (state.type === 'command') {
      const active = this.activeCommandAutocomplete();
      if (!active) {
        this.autocompleteState.update((s) => ({ ...s, visible: false }));
        return;
      }

      newText = text.substring(0, active.start) + item.label + ' ' + text.substring(active.end);
      newCursorPos = active.start + item.label.length + 1;
      this.activeCommandAutocomplete.set(null);
    } else {
      this.autocompleteState.update((s) => ({ ...s, visible: false }));
      return;
    }

    this.promptControl.setValue(newText);
    this.syncSelectedFileReferencesWithText(newText);

    setTimeout(() => {
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);

    this.autocompleteState.update((s) => ({ ...s, visible: false }));
    this.highlightedAutocompleteIndex.set(0);
  }

  protected onAutocompleteDismiss(): void {
    this.autocompleteState.update((s) => ({ ...s, visible: false }));
    this.highlightedAutocompleteIndex.set(0);
    this.activeFileAutocomplete.set(null);
    this.activeCommandAutocomplete.set(null);
  }

  protected onAutocompleteItemMouseDown(event: MouseEvent): void {
    event.preventDefault();
  }

  protected onPromptBlur(): void {
    this.onAutocompleteDismiss();
  }

  protected onPromptCursorActivity(): void {
    const textarea = this.promptInput().nativeElement;
    const text = textarea.value ?? this.promptControl.value ?? '';
    const cursorPos = textarea.selectionStart ?? 0;
    const state = this.autocompleteState();

    if (!state.visible) {
      return;
    }

    if (state.type === 'file' && this.getFileAutocompleteContext(text, cursorPos)) return;
    if (state.type === 'command' && this.getCommandAutocompleteContext(text, cursorPos)) return;

    this.onAutocompleteDismiss();
  }

  protected onRetry(): void {
    this.eventService.cancel();
    this.store.setConnectionState('connecting');
    void this.loadInitialData();
    this.eventService.subscribe();
  }

  protected onInput(): void {
    const textarea = this.promptInput().nativeElement;
    const text = textarea.value ?? this.promptControl.value ?? '';
    const cursorPos = textarea.selectionStart ?? 0;

    this.syncSelectedFileReferencesWithText(text);

    const fileContext = this.getFileAutocompleteContext(text, cursorPos);
    if (fileContext) {
      this.activeFileAutocomplete.set(fileContext);
      this.activeCommandAutocomplete.set(null);
      this.autocompleteState.set({ visible: true, type: 'file' });
      this.highlightedAutocompleteIndex.set(0);
      void this.loadFileAutocomplete(fileContext.query);
      return;
    }

    const commandContext = this.getCommandAutocompleteContext(text, cursorPos);
    if (commandContext) {
      this.activeCommandAutocomplete.set(commandContext);
      this.activeFileAutocomplete.set(null);
      this.autocompleteState.set({ visible: true, type: 'command' });
      this.highlightedAutocompleteIndex.set(0);
      void this.loadCommandAutocomplete(commandContext.query);
      return;
    }

    this.activeFileAutocomplete.set(null);
    this.activeCommandAutocomplete.set(null);

    if (this.autocompleteState().visible) {
      this.autocompleteState.update((s) => ({ ...s, visible: false }));
    }

    requestAnimationFrame(() => {
      this.syncPromptOverlayScroll();
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const state = this.autocompleteState();

    if (state.visible && this.autocompleteItems().length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const items = this.autocompleteItems();
        this.highlightedAutocompleteIndex.update((i) => (i + 1) % items.length);
        this.scrollHighlightedIntoView();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const items = this.autocompleteItems();
        this.highlightedAutocompleteIndex.update((i) => (i <= 0 ? items.length - 1 : i - 1));
        this.scrollHighlightedIntoView();
        return;
      }

      if (event.key === 'Enter') {
        const index = this.highlightedAutocompleteIndex();
        const items = this.autocompleteItems();
        if (index >= 0 && index < items.length) {
          event.preventDefault();
          this.onAutocompleteSelect(items[index]);
          return;
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        this.onAutocompleteDismiss();
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.sendPrompt();
    }
  }

  protected interuptSession(): void {
    const sessionId = this.store.activeSessionId();
    if (!sessionId) {
      return;
    }

    if (this.store.isStreaming()) {
      this.clientService.abortSession(sessionId);
    }
  }

  protected async removeSession(sessionId: string): Promise<void> {
    try {
      await this.clientService.deleteSession(sessionId);
      this.store.removeSession(sessionId);
      toast.success('Session archived');
    } catch (err) {
      console.error('Failed to remove session:', err);
    }
  }

  protected async sendPrompt(): Promise<void> {
    const rawText = this.promptControl.value ?? '';
    const trimmedText = rawText.trim();
    if (!trimmedText) return;
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

    const selectedAgent = this.selectedAgentControl.value;
    const selectedVariant = this.selectedVariantControl.value;

    this.syncSelectedFileReferencesWithText(trimmedText);
    const selectedRefsSnapshot = this.selectedFileReferences().map((ref) => ({ ...ref }));
    const fileRefs = this.toFilePartInputs();
    const commandMatch = trimmedText.match(/^\/(\S+)(?:\s+(.*))?$/);

    this.promptControl.setValue('');
    this.selectedFileReferences.set([]);
    this.activeFileAutocomplete.set(null);
    this.activeCommandAutocomplete.set(null);
    this.autocompleteState.set({ visible: false, type: null });

    try {
      if (commandMatch) {
        this.scrollToBottom();
        const [, commandName, args] = commandMatch;
        await this.clientService.executeCommand(sessionId, commandName, {
          arguments: args ?? '',
          agent: selectedAgent?.name,
          model: selectedModel?.id,
          variant: selectedVariant,
          parts: fileRefs.length > 0 ? fileRefs : undefined,
        });
      } else {
        this.scrollToBottom();
        await this.clientService.promptSession(sessionId, trimmedText, model, {
          agent: selectedAgent?.name,
          variant: selectedVariant,
          parts: fileRefs.length > 0 ? fileRefs : undefined,
        });
      }
    } catch (err) {
      console.error('Failed to send prompt:', err);
      this.promptControl.setValue(trimmedText);
      this.selectedFileReferences.set(selectedRefsSnapshot);
    }
  }

  private getFileAutocompleteContext(
    text: string,
    cursorPos: number,
  ): { start: number; end: number; query: string } | null {
    const tokenRange = getTokenRangeAtCursor(text, cursorPos);
    if (!tokenRange) return null;

    const tokenBeforeCursor = text.substring(tokenRange.start, cursorPos);
    if (!tokenBeforeCursor.startsWith('@')) return null;

    const fullToken = text.substring(tokenRange.start, tokenRange.end);

    return {
      start: tokenRange.start,
      end: tokenRange.end,
      query: fullToken.slice(1),
    };
  }

  private getCommandAutocompleteContext(
    text: string,
    cursorPos: number,
  ): { start: number; end: number; query: string } | null {
    const tokenRange = getTokenRangeAtCursor(text, cursorPos);
    if (!tokenRange) return null;

    if (text.substring(0, tokenRange.start).trim().length > 0) return null;

    const tokenBeforeCursor = text.substring(tokenRange.start, cursorPos);
    if (!tokenBeforeCursor.startsWith('/')) return null;

    return {
      start: tokenRange.start,
      end: tokenRange.end,
      query: tokenBeforeCursor.slice(1),
    };
  }

  private syncSelectedFileReferencesWithText(text: string): void {
    const refs = this.selectedFileReferences();
    if (refs.length === 0) return;

    const usedRanges: Array<{ start: number; end: number }> = [];
    const synced: SelectedFileReference[] = [];

    const sortedRefs = [...refs].sort((a, b) => a.start - b.start);
    for (const ref of sortedRefs) {
      const occurrences = findTokenOccurrences(text, ref.token);
      const candidate = occurrences
        .filter(
          (range) =>
            !usedRanges.some((used) => used.start === range.start && used.end === range.end),
        )
        .sort((a, b) => Math.abs(a.start - ref.start) - Math.abs(b.start - ref.start))[0];

      if (!candidate) continue;

      usedRanges.push(candidate);
      synced.push({
        ...ref,
        start: candidate.start,
        end: candidate.end,
      });
    }

    this.selectedFileReferences.set(synced.sort((a, b) => a.start - b.start));
  }

  private toFilePartInputs(): FilePartInput[] {
    return this.selectedFileReferences().map((ref) => ({
      type: 'file',
      mime: ref.mime,
      filename: ref.filename,
      url: ref.url,
      source: {
        text: {
          value: ref.token,
          start: ref.start,
          end: ref.end,
        },
        type: 'file',
        path: ref.path,
      },
    }));
  }

  private toAbsolutePath(currentDir: string, path: string): string {
    const normalizedPath = path.trim();
    if (normalizedPath.startsWith('/')) {
      return normalizedPath;
    }

    const normalizedCurrentDir = currentDir === '/' ? '' : currentDir.replace(/\/+$/, '');
    return `${normalizedCurrentDir}/${normalizedPath}`;
  }

  private scrollHighlightedIntoView(): void {
    requestAnimationFrame(() => {
      const list = this.autocompleteList()?.nativeElement;
      if (!list) return;
      const highlighted = list.querySelector('[data-ac-idx].ac-highlighted');
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  protected onPromptScroll(): void {
    this.syncPromptOverlayScroll();
  }

  protected onScrollContainerContentMutated(): void {
    if (this.store.isStreaming() && this.shouldStickToBottom()) {
      this.scrollMutationVersion.update((version) => version + 1);
    }
  }

  private syncPromptOverlayScroll(): void {
    const textarea = this.promptInput().nativeElement;
    this.promptScrollTop.set(textarea.scrollTop);
    this.promptScrollLeft.set(textarea.scrollLeft);
  }
}
