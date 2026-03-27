import { computed, Injectable, signal } from '@angular/core';
import { ChatMessage, ChatSessionState } from '@qos/chat/shared-models';

const createEmptyChatState = (): ChatSessionState => ({
  messages: [],
  isStreaming: false,
  streamingContent: '',
  isLoaded: false,
  isLoading: false,
});

@Injectable({ providedIn: 'root' })
export class ChatStateStore {
  private readonly chatSessions = signal<Record<string, ChatSessionState>>({});

  readonly sessions = computed(() => this.chatSessions());

  getSession(chatKey: string): ChatSessionState {
    const existingSession = this.chatSessions()[chatKey];

    if (existingSession) {
      return existingSession;
    }

    const nextSession = createEmptyChatState();
    this.chatSessions.update((sessions) => ({
      ...sessions,
      [chatKey]: nextSession,
    }));

    return nextSession;
  }

  setLoading(chatKey: string, requestId: string): void {
    this.updateSession(chatKey, (session) => ({
      ...session,
      isLoading: true,
      error: undefined,
      activeLoadRequestId: requestId,
    }));
  }

  setMessages(chatKey: string, messages: ChatMessage[], requestId?: string): void {
    this.updateSession(chatKey, (session) => {
      if (requestId && session.activeLoadRequestId !== requestId) {
        return session;
      }

      return {
        ...session,
        messages,
        isLoaded: true,
        isLoading: false,
        activeLoadRequestId: undefined,
        error: undefined,
      };
    });
  }

  setLoadError(chatKey: string, error: string, requestId?: string): void {
    this.updateSession(chatKey, (session) => {
      if (requestId && session.activeLoadRequestId !== requestId) {
        return session;
      }

      return {
        ...session,
        isLoaded: true,
        isLoading: false,
        activeLoadRequestId: undefined,
        error,
      };
    });
  }

  appendMessage(chatKey: string, message: ChatMessage): void {
    this.updateSession(chatKey, (session) => ({
      ...session,
      messages: [...session.messages, message],
      isLoaded: true,
      isLoading: false,
      error: undefined,
    }));
  }

  replaceMessages(chatKey: string, messages: ChatMessage[]): void {
    this.updateSession(chatKey, (session) => ({
      ...session,
      messages,
      isLoaded: true,
      isLoading: false,
      error: undefined,
    }));
  }

  startStreaming(chatKey: string, requestId: string): void {
    this.updateSession(chatKey, (session) => ({
      ...session,
      isStreaming: true,
      streamingContent: '',
      activeStreamRequestId: requestId,
      error: undefined,
    }));
  }

  appendStreamingChunk(chatKey: string, chunk: string, requestId: string): void {
    this.updateSession(chatKey, (session) => {
      if (session.activeStreamRequestId !== requestId) {
        return session;
      }

      return {
        ...session,
        streamingContent: session.streamingContent + chunk,
      };
    });
  }

  finishStreaming(chatKey: string, requestId: string): ChatMessage | undefined {
    let assistantMessage: ChatMessage | undefined;

    this.updateSession(chatKey, (session) => {
      if (session.activeStreamRequestId !== requestId) {
        return session;
      }

      const finalContent = session.streamingContent;

      assistantMessage = finalContent
        ? {
            role: 'assistant',
            content: finalContent,
          }
        : undefined;

      return {
        ...session,
        messages: assistantMessage ? [...session.messages, assistantMessage] : session.messages,
        isStreaming: false,
        streamingContent: '',
        activeStreamRequestId: undefined,
      };
    });

    return assistantMessage;
  }

  stopStreaming(chatKey: string, requestId?: string): void {
    this.updateSession(chatKey, (session) => {
      if (requestId && session.activeStreamRequestId !== requestId) {
        return session;
      }

      return {
        ...session,
        isStreaming: false,
        streamingContent: '',
        activeStreamRequestId: undefined,
      };
    });
  }

  moveSession(fromChatKey: string, toChatKey: string): void {
    if (fromChatKey === toChatKey) {
      return;
    }

    const sessions = this.chatSessions();
    const fromSession = sessions[fromChatKey];

    if (!fromSession) {
      this.getSession(toChatKey);
      return;
    }

    this.chatSessions.update((currentSessions) => {
      const nextSessions = { ...currentSessions, [toChatKey]: fromSession };
      delete nextSessions[fromChatKey];
      return nextSessions;
    });
  }

  deleteSession(chatKey: string): void {
    this.chatSessions.update((sessions) => {
      if (!sessions[chatKey]) {
        return sessions;
      }

      const nextSessions = { ...sessions };
      delete nextSessions[chatKey];
      return nextSessions;
    });
  }

  removeLastMessage(chatKey: string): void {
    this.updateSession(chatKey, (session) => {
      if (session.messages.length === 0) {
        return session;
      }

      return {
        ...session,
        messages: session.messages.slice(0, -1),
      };
    });
  }

  private updateSession(
    chatKey: string,
    updater: (session: ChatSessionState) => ChatSessionState,
  ): void {
    this.chatSessions.update((sessions) => {
      const currentSession = sessions[chatKey] ?? createEmptyChatState();
      const nextSession = updater(currentSession);

      if (nextSession === currentSession) {
        return sessions;
      }

      return {
        ...sessions,
        [chatKey]: nextSession,
      };
    });
  }
}
