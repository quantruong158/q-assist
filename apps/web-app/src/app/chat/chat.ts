import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CameraSource } from '@capacitor/camera';

import { ChatService } from './chat.service';
import { Message } from './message/message';
import { AuthService } from '../services/auth.service';
import { ConversationService } from '../services/conversation.service';
import { MessageService } from '../services/message.service';
import { UploadService, UploadResult } from '../services/upload.service';
import { LayoutService } from '../services/layout.service';
import { CameraService } from '../services/camera.service';
import { PlatformService } from '../services/platform.service';
import { Attachment } from '../models';
import { DEFAULT_MODEL, SUPPORTED_MODELS, AiModel } from '../ai-model.config';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDropdownMenuImports } from '@spartan-ng/helm/dropdown-menu';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { KeyValuePipe, NgTemplateOutlet } from '@angular/common';
import { StorageService } from '../services/storage.service';
import { throttleTime } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeAdd01,
  hugeAlert02,
  hugeArrowUp02,
  hugeCamera02,
  hugeCancel01,
  hugeImageUpload,
} from '@ng-icons/huge-icons';
import { HlmSidebarService } from '@spartan-ng/helm/sidebar';
import { Router } from '@angular/router';
import { ChatAttachment, ChatMessage } from './chat.model';
import { ChatStateService } from './chat-state.service';

const CONTEXT_WINDOW_SIZE = 20;
const DRAFT_CHAT_KEY = '__draft__';

interface PendingAttachment {
  id: string;
  file: File;
  previewUrl: string;
  uploadResult?: UploadResult;
  isUploading: boolean;
  error?: string;
}

@Component({
  selector: 'app-chat',
  imports: [
    ReactiveFormsModule,
    BrnSelectImports,
    HlmButtonImports,
    HlmDropdownMenuImports,
    HlmIconImports,
    HlmInputGroupImports,
    HlmSelectImports,
    HlmSpinnerImports,
    TextFieldModule,
    Message,
    KeyValuePipe,
    NgTemplateOutlet,
    NgIcon,
  ],
  providers: [
    provideIcons({
      hugeArrowUp02,
      hugeImageUpload,
      hugeAdd01,
      hugeCamera02,
      hugeAlert02,
      hugeCancel01,
    }),
  ],
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
  private readonly chatStateService = inject(ChatStateService);
  private readonly authService = inject(AuthService);
  private readonly conversationService = inject(ConversationService);
  private readonly messageService = inject(MessageService);
  private readonly uploadService = inject(UploadService);
  private readonly cameraService = inject(CameraService);
  private readonly platformService = inject(PlatformService);
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
  protected readonly models = Object.groupBy(SUPPORTED_MODELS, (m) => m.provider);

  protected readonly isNative = this.platformService.isNative;

  protected readonly pendingAttachments = signal<PendingAttachment[]>([]);

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

  protected readonly currentUser = computed(() => this.authService.currentUser());

  protected readonly canSend = computed(() => {
    const hasContent = this.userPrompt()?.trim() || this.pendingAttachments().length > 0;
    const notLoading = !this.isStreaming();
    const notUploading = !this.pendingAttachments().some((a: PendingAttachment) => a.isUploading);
    const noErrors = !this.pendingAttachments().some((a: PendingAttachment) => a.error);

    return hasContent && notLoading && notUploading && noErrors;
  });

  protected readonly isInitialChat = computed(() => {
    return this.messages().length === 0 && !this.isConversationLoading() && !this.id();
  });

  private readonly messagesContainer = viewChild<ElementRef<HTMLElement>>('messagesContainer');
  private readonly STORAGE_KEY = 'preferred_ai_model_id';

  protected compareModels(a: AiModel, b: AiModel): boolean {
    return a?.id === b?.id;
  }

  constructor() {
    effect(() => {
      const content = this.throttledStreamingContent();
      if (content && this.isNearBottom()) {
        this.scrollToBottom();
      }
    });

    effect(() => {
      this.storageService.setItem(this.STORAGE_KEY, this.selectedModelValue().id);
    });

    this.initModel();
  }

  private initModel(): void {
    const savedModelId = this.storageService.getItem<string>(this.STORAGE_KEY);

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
      .filter((a: PendingAttachment) => a.uploadResult && !a.error)
      .map((a: PendingAttachment) => a.uploadResult!);

    if ((!text && attachments.length === 0) || currentSession.isStreaming || !user) return;

    const chatAttachments: ChatAttachment[] = attachments.map((a) => ({
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

      const recentMessages = await this.messageService.getRecentMessages(
        user.uid,
        conversationId,
        CONTEXT_WINDOW_SIZE,
      );

      const contextMessages: ChatMessage[] = recentMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments?.map((a: Attachment) => ({
          url: a.url,
          mimeType: a.mimeType,
        })),
      }));

      const { stream, output } = await this.chatService.sendMessage(
        contextMessages,
        this.selectedModel.value.id,
        conversationId,
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
      this.chatStateService.stopStreaming(chatKey, streamRequestId);
      this.scrollToBottom();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    const imageItems = Array.from(items).filter((item) => item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

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

  protected onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);

    for (const file of files) {
      if (this.pendingAttachments().length >= this.uploadService.MAX_FILES) {
        break;
      }
      this.addAttachment(file);
    }

    input.value = '';
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
    if (this.pendingAttachments().length >= this.uploadService.MAX_FILES) return;

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
    if (!container) return true;

    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return scrollBottom < 100;
  }
}
