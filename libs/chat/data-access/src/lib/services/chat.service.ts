import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Functions } from '@angular/fire/functions';
import { httpsCallable } from 'firebase/functions';
import { ChatRequest, ChatResponse } from '@qos/chat/shared-models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly functions = inject(Functions);

  async sendMessage(
    prompt: string,
    sessionId: string,
    modelId?: string,
    attachments?: Array<{ url: string; mimeType: string }>,
    isRetry = false,
  ) {
    if (!isPlatformBrowser(this.platformId)) {
      return {
        stream: (async function* () {
          //
        })(),
        output: Promise.resolve({ text: '', sessionId } as ChatResponse),
      };
    }

    const chatEndpoint = httpsCallable<ChatRequest, ChatResponse>(this.functions, 'chat');
    const callResult = await chatEndpoint.stream({
      prompt,
      sessionId,
      model: modelId,
      attachments,
      isRetry,
    });

    return {
      stream: callResult.stream,
      output: callResult.data,
    };
  }
}
