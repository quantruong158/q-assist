import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { streamFlow } from 'genkit/beta/client';
import { API_BASE_URL } from '../core/tokens/api-base-url.token';

export interface ChatAttachment {
  url: string;
  mimeType: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
}

export interface ChatResponse {
  response: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly auth = inject(Auth);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  async sendMessage(messages: ChatMessage[], modelId?: string, conversationId?: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return {
        stream: (async function* () {
          // Intentionally empty
        })(),
        output: Promise.resolve({ response: '' } as ChatResponse),
      };
    }

    const token = await this.auth.currentUser?.getIdToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const result = streamFlow<ChatResponse, string>({
      url: `${this.apiBaseUrl}/api/chat`,
      input: { messages, model: modelId, conversationId },
      headers,
    });

    return {
      stream: result.stream,
      output: result.output,
    };
  }
}
