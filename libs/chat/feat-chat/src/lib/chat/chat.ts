import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  model,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { CameraSource } from '@capacitor/camera';
import {
  Attachment,
  ChatAttachment,
  ChatMessage,
  ChatService,
  ChatStateStore,
  ConversationService,
  MessageService,
  UploadResult,
  UploadService,
} from '@qos/chat/data-access';
import { ChatComposer, ChatComposerAttachment, ChatMessageList } from '@qos/chat/ui';
import { AuthStore } from '@qos/shared/auth/data-access';
import { StorageService } from '@qos/shared/data-access';
import { DEFAULT_MODEL, SUPPORTED_MODELS, AiModel } from '@qos/shared/models';
import { CameraService } from '@qos/shared/util-hardware';
import { throttleTime } from 'rxjs';
import { HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { Router } from '@angular/router';
import { LayoutService } from '@qos/shared/data-access';
import { toast } from 'ngx-sonner';

const DRAFT_CHAT_KEY = '__draft__';

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  uploadResult?: UploadResult;
  isUploading: boolean;
  error?: string;
}

type PendingComposerAttachment = PendingAttachment;

function groupModelsByProvider(models: readonly AiModel[]): Partial<Record<string, AiModel[]>> {
  return models.reduce<Partial<Record<string, AiModel[]>>>((groups, model) => {
    const providerModels = groups[model.provider] ?? [];
    groups[model.provider] = [...providerModels, model];
    return groups;
  }, {});
}

@Component({
  selector: 'chat-route',
  imports: [ChatMessageList, ChatComposer],
  templateUrl: './chat.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(paste)': 'onPaste($event)',
    class:
      'pt-4 flex-1 overflow-y-auto pb-[calc(220px+var(--safe-area-bottom))] max-[600px]:pb-[calc(190px+var(--safe-area-bottom))]',
  },
})
export class Chat {
  private readonly chatService = inject(ChatService);
  private readonly chatStateService = inject(ChatStateStore);
  private readonly authStore = inject(AuthStore);
  private readonly conversationService = inject(ConversationService);
  private readonly messageService = inject(MessageService);
  protected readonly uploadService = inject(UploadService);
  private readonly cameraService = inject(CameraService);
  private readonly storageService = inject(StorageService);
  protected readonly layoutService = inject(LayoutService);
  protected readonly sidebarService = inject(HlmSidebarService);
  private readonly router = inject(Router);

  readonly id = model<string>();

  protected readonly currentChatKey = computed(() => this.id() ?? DRAFT_CHAT_KEY);
  private readonly currentChatSession = computed(() => {
    const chatKey = this.currentChatKey();
    return this.chatStateService.sessions()[chatKey];
  });
  protected readonly messages = computed(() => this.currentChatSession()?.messages ?? []);
  protected readonly isStreaming = computed(() => this.currentChatSession()?.isStreaming ?? false);
  protected readonly streamingContent = computed(
    () => this.currentChatSession()?.streamingContent ?? '',
  );

  private readonly _ = resource({
    params: () => {
      const conversationId = this.id();
      const user = this.currentUser();
      const session = conversationId ? this.chatStateService.sessions()[conversationId] : undefined;

      if (!conversationId || !user || session?.isLoaded || session?.isLoading) {
        return undefined;
      }

      return {
        chatKey: conversationId,
        conversationId,
        userId: user.uid,
      };
    },
    loader: async ({ params }) => {
      const requestId = crypto.randomUUID();
      this.chatStateService.setLoading(params.chatKey, requestId);

      try {
        const messages = await this.messageService.getRecentMessages(
          params.userId,
          params.conversationId,
          100,
        );

        const chatMessages: ChatMessage[] = messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
          attachments: msg.attachments?.map((a: Attachment) => ({
            url: a.url,
            mimeType: a.mimeType,
          })),
        }));
        this.messages();
        this.chatStateService.setMessages(params.chatKey, chatMessages, requestId);
        requestAnimationFrame(() => this.scrollToBottom());

        return chatMessages;
      } catch (error) {
        console.error('Error loading conversation:', error);
        this.chatStateService.setLoadError(
          params.chatKey,
          'Failed to load conversation.',
          requestId,
        );
        return [];
      }
    },
    defaultValue: [],
  });

  protected readonly isConversationLoading = computed(
    () => !!this.currentChatSession()?.isLoading && this.messages().length === 0,
  );

  protected readonly inputText = new FormControl('');
  protected readonly selectedModel = new FormControl<AiModel>(DEFAULT_MODEL, {
    nonNullable: true,
  });
  protected readonly models = groupModelsByProvider(SUPPORTED_MODELS);
  protected readonly maxFiles = this.uploadService.MAX_FILES;

  protected readonly pendingAttachments = signal<PendingComposerAttachment[]>([]);

  protected readonly userPrompt = toSignal(this.inputText.valueChanges, { initialValue: '' });
  protected readonly selectedModelValue = toSignal(this.selectedModel.valueChanges, {
    initialValue: DEFAULT_MODEL,
  });
  protected readonly throttledStreamingContent = toSignal(
    toObservable(this.streamingContent).pipe(throttleTime(500, undefined, { trailing: true })),
    {
      initialValue: '',
    },
  );

  protected readonly currentUser = computed(() => this.authStore.currentUser());
  private readonly messageList = viewChild(ChatMessageList);

  protected readonly canSend = computed(() => {
    const hasContent = !!this.userPrompt()?.trim() || this.pendingAttachments().length > 0;
    const notLoading = !this.isStreaming();
    const notUploading = !this.pendingAttachments().some((a: PendingAttachment) => a.isUploading);
    const noErrors = !this.pendingAttachments().some((a: PendingAttachment) => a.error);

    return hasContent && notLoading && notUploading && noErrors;
  });

  protected readonly isInitialChat = computed(() => {
    return this.messages().length === 0 && !this.isConversationLoading() && !this.id();
  });

  protected readonly composerAttachments = computed<ChatComposerAttachment[]>(() =>
    this.pendingAttachments().map(({ id, file, previewUrl, isUploading, error }) => ({
      id,
      file,
      previewUrl,
      isUploading,
      error,
    })),
  );

  private readonly messagesContainer = viewChild<ElementRef<HTMLElement>>('messagesContainer');
  private readonly storageKey = 'preferred_ai_model_id';

  protected compareModels(a: AiModel, b: AiModel): boolean {
    return a?.id === b?.id;
  }

  protected async copyMessage(text: string): Promise<void> {
    if (!text || !globalThis.navigator?.clipboard?.writeText) {
      return;
    }

    try {
      await globalThis.navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch (error) {
      console.error('Error copying message to clipboard:', error);
    }
  }

  constructor() {
    effect(() => {
      const content = this.throttledStreamingContent();
      if (content && this.isNearBottom()) {
        this.scrollToBottom();
      }
    });

    effect(() => {
      this.storageService.setItem(this.storageKey, this.selectedModelValue().id);
    });

    this.initModel();
  }

  private initModel(): void {
    const savedModelId = this.storageService.getItem<string>(this.storageKey);

    if (savedModelId) {
      const model = SUPPORTED_MODELS.find((m) => m.id === savedModelId);
      if (model) {
        this.selectedModel.setValue(model);
      }
    }
  }

  protected async sendMessage(): Promise<void> {
    const text = (this.inputText.value ?? '').trim();
    const user = this.currentUser();
    const initialChatKey = this.currentChatKey();
    const currentSession = this.chatStateService.getSession(initialChatKey);
    const attachments = this.pendingAttachments()
      .filter((a) => !a.error)
      .map((a) => a.uploadResult)
      .filter((res) => res !== undefined);

    if ((!text && attachments.length === 0) || currentSession.isStreaming || !user) {
      return;
    }

    const chatAttachments: ChatAttachment[] = attachments.map((a) => ({
      url: a.url,
      mimeType: a.mimeType,
    }));

    // Prepare attachment URLs to send
    const attachmentsToSend: Array<{ url: string; mimeType: string }> = attachments.map((a) => ({
      url: a.url,
      mimeType: a.mimeType,
    }));

    const userMessage: ChatMessage = {
      role: 'user',
      content: text || '(Image attached)',
      attachments: chatAttachments.length > 0 ? chatAttachments : undefined,
    };
    this.chatStateService.appendMessage(initialChatKey, userMessage);
    this.inputText.setValue('');
    this.clearAttachments();

    const streamRequestId = crypto.randomUUID();
    this.chatStateService.startStreaming(initialChatKey, streamRequestId);
    this.scrollToBottom();

    let chatKey = initialChatKey;

    try {
      let conversationId = this.conversationService.activeConversationId();

      if (!conversationId) {
        conversationId = await this.conversationService.createConversation(user.uid, {
          title: this.conversationService.generateTitle(text || 'Image'),
          lastMessage: text || '(Image attached)',
        });

        this.chatStateService.moveSession(initialChatKey, conversationId);
        chatKey = conversationId;
        this.id.set(conversationId);

        this.router.navigate(['/chat', conversationId], { replaceUrl: true });
      }

      const firestoreAttachments: Attachment[] = attachments.map((a: UploadResult) => ({
        url: a.url,
        mimeType: a.mimeType,
        filename: a.filename,
      }));

      const order = await this.messageService.getNextOrder(user.uid, conversationId);
      await this.messageService.addMessage(user.uid, conversationId, {
        role: 'user',
        content: text || '(Image attached)',
        order,
        ...(firestoreAttachments.length > 0 && { attachments: firestoreAttachments }),
      });

      const { stream, output } = await this.chatService.sendMessage(
        text || '(Image attached)',
        conversationId,
        this.selectedModel.value.id,
        attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      );

      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
          this.chatStateService.appendStreamingChunk(chatKey, chunk, streamRequestId);
        }
      }

      await output;
      this.chatStateService.finishStreaming(chatKey, streamRequestId);
    } catch (error) {
      console.error('Error sending message:', error);

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, an error occurred while processing your request.',
      };
      this.chatStateService.appendMessage(chatKey, errorMessage);
    } finally {
      this.messageList()?.resetRetryAction();
      this.chatStateService.stopStreaming(chatKey, streamRequestId);
      this.scrollToBottom();
    }
  }

  protected async retryLastMessage(): Promise<void> {
    const user = this.currentUser();
    const chatKey = this.currentChatKey();
    const messages = this.messages();
    const conversationId = this.id();

    if (!user || !conversationId || messages.length < 2) {
      return;
    }

    let lastUserMessageIndex = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) {
      return;
    }

    const lastUserMessage = messages[lastUserMessageIndex];
    const streamRequestId = crypto.randomUUID();

    try {
      // Remove the last assistant message from UI
      this.chatStateService.removeLastMessage(chatKey);

      // Delete the last assistant message from Firestore
      await this.messageService.deleteLastAssistantMessage(user.uid, conversationId);

      this.chatStateService.startStreaming(chatKey, streamRequestId);
      this.scrollToBottom();

      // Prepare attachments from the last user message
      const attachmentsToSend = lastUserMessage.attachments?.map((att) => ({
        url: att.url,
        mimeType: att.mimeType,
      }));

      // Resend the last user message with isRetry flag
      const { stream, output } = await this.chatService.sendMessage(
        lastUserMessage.content,
        conversationId,
        this.selectedModel.value.id,
        attachmentsToSend && attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
        true,
      );

      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
          this.chatStateService.appendStreamingChunk(chatKey, chunk, streamRequestId);
        }
      }

      await output;
      this.chatStateService.finishStreaming(chatKey, streamRequestId);
    } catch (error) {
      console.error('Error retrying message:', error);

      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, an error occurred while retrying your request.',
      };
      this.chatStateService.appendMessage(chatKey, errorMessage);
    } finally {
      this.messageList()?.resetRetryAction();
      this.chatStateService.stopStreaming(chatKey, streamRequestId);
      this.scrollToBottom();
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }

    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) {
      return;
    }

    event.preventDefault();

    for (const item of imageItems) {
      if (this.pendingAttachments().length >= this.uploadService.MAX_FILES) {
        break;
      }

      const file = item.getAsFile();
      if (file) {
        this.addAttachment(file);
      }
    }
  }

  protected onFilesSelected(files: File[]): void {
    for (const file of files) {
      if (this.pendingAttachments().length >= this.uploadService.MAX_FILES) {
        break;
      }
      this.addAttachment(file);
    }
  }

  protected removeAttachment(id: string): void {
    const attachment = this.pendingAttachments().find((a: PendingAttachment) => a.id === id);
    if (attachment) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    this.pendingAttachments.update((attachments: PendingAttachment[]) =>
      attachments.filter((a: PendingAttachment) => a.id !== id),
    );
  }

  private addAttachment(file: File): void {
    const error = this.uploadService.validateFile(file);
    if (error) {
      console.error('File validation error:', error);
      return;
    }

    const id = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);

    const attachment: PendingAttachment = {
      id,
      file,
      previewUrl,
      isUploading: true,
    };

    this.pendingAttachments.update((attachments: PendingAttachment[]) => [
      ...attachments,
      attachment,
    ]);
    this.uploadAttachment(attachment);
  }

  private uploadAttachment(attachment: PendingAttachment): void {
    const userId = this.currentUser()?.uid;
    if (!userId) {
      return;
    }

    this.uploadService.uploadFile(attachment.file, userId).subscribe({
      next: (result) => {
        this.pendingAttachments.update((attachments: PendingAttachment[]) =>
          attachments.map((a: PendingAttachment) =>
            a.id === attachment.id ? { ...a, uploadResult: result, isUploading: false } : a,
          ),
        );
      },
      error: (err) => {
        let errorMsg = 'Upload failed';
        if (err?.message) {
          errorMsg += `: ${err.message}`;
        }
        if (err?.status) {
          errorMsg += ` (${err.status})`;
        }

        this.pendingAttachments.update((attachments: PendingAttachment[]) =>
          attachments.map((a: PendingAttachment) =>
            a.id === attachment.id ? { ...a, isUploading: false, error: errorMsg } : a,
          ),
        );
      },
    });
  }

  private clearAttachments(): void {
    for (const attachment of this.pendingAttachments()) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    this.pendingAttachments.set([]);
  }

  protected async onTakePhoto(): Promise<void> {
    if (this.pendingAttachments().length >= this.uploadService.MAX_FILES) {
      return;
    }

    try {
      const file = await this.cameraService.capturePhoto(CameraSource.Camera);
      if (file) {
        this.addAttachment(file);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  }

  private scrollToBottom(): void {
    const container = this.messagesContainer()?.nativeElement;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight + 100,
        behavior: 'smooth',
      });
    }
  }

  private isNearBottom(): boolean {
    const container = this.messagesContainer()?.nativeElement;
    if (!container) {
      return true;
    }

    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return scrollBottom < 100;
  }
}
