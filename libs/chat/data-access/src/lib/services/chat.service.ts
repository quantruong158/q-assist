import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Functions } from '@angular/fire/functions';
import { httpsCallable } from 'firebase/functions';
import { ChatMessage, ChatRequest, ChatResponse } from '@qos/chat/shared-models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly functions = inject(Functions);

  async sendMessage(messages: ChatMessage[], modelId?: string, conversationId?: string) {
    if (!isPlatformBrowser(this.platformId)) {
      return {
        stream: (async function* () {
          //
        })(),
        output: Promise.resolve({ response: '' } as ChatResponse),
      };
    }

    const chatEndpoint = httpsCallable<ChatRequest, ChatResponse>(this.functions, 'chat');
    const callResult = await chatEndpoint.stream({
      messages,
      model: modelId,
      conversationId,
    });

    return {
      stream: callResult.stream,
      output: callResult.data,
    };
  }
}
