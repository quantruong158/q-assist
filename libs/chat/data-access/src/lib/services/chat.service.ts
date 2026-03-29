import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, InjectionToken, PLATFORM_ID } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { ChatRequest, ChatResponse } from '@qos/chat/shared-models';

export const API_BASE_URL = new InjectionToken<string>('apiBaseUrl', {
  providedIn: 'root',
  factory: () => '',
});

interface SendMessageResult {
  stream: AsyncGenerator<string, void, unknown>;
  output: Promise<ChatResponse>;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly auth = inject(Auth);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  async sendMessage(
    prompt: string,
    sessionId: string,
    modelId?: string,
    attachments?: Array<{ url: string; mimeType: string; filename?: string }>,
    isRetry = false,
  ) {
    if (!isPlatformBrowser(this.platformId)) {
      const stream = (async function* () {
        yield;
        return;
      })();
      return {
        stream: stream as AsyncGenerator<string, void, unknown>,
        output: Promise.resolve({ text: '', sessionId } as ChatResponse),
      } as SendMessageResult;
    }

    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const idToken = await user.getIdToken();
    const request: ChatRequest = {
      prompt,
      sessionId,
      model: modelId,
      attachments,
      isRetry,
    };

    const response = await fetch(`${this.apiBaseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok || !response.body) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const streamResult = this.parseSSEStream(response.body, sessionId);

    return {
      stream: streamResult.stream,
      output: streamResult.outputPromise,
    } as SendMessageResult;
  }

  private parseSSEStream(
    body: ReadableStream<Uint8Array>,
    sessionId: string,
  ): {
    stream: AsyncGenerator<string, void, unknown>;
    outputPromise: Promise<ChatResponse>;
  } {
    const decoder = new TextDecoder();
    let buffer = '';
    let settled = false;
    let resolveOutputRef: ((value: ChatResponse) => void) | undefined;
    let rejectOutputRef: ((error: Error) => void) | undefined;
    const outputPromise = new Promise<ChatResponse>((resolve, reject) => {
      resolveOutputRef = resolve;
      rejectOutputRef = reject;
    });

    const resolveOutput = (value: ChatResponse): void => {
      if (settled) {
        return;
      }

      settled = true;
      resolveOutputRef?.(value);
    };

    const rejectOutput = (error: Error): void => {
      if (settled) {
        return;
      }

      settled = true;
      rejectOutputRef?.(error);
    };

    const stream: AsyncGenerator<string, void, unknown> = (async function* () {
      const reader = body.getReader();
      let accumulatedText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (accumulatedText.trim().length > 0) {
              resolveOutput({ text: accumulatedText, sessionId });
            } else {
              rejectOutput(new Error('Stream ended before completion'));
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith(':') || line.trim() === '') {
              continue;
            }

            if (line.startsWith('event: done')) {
              resolveOutput({ text: accumulatedText, sessionId });
              return;
            }

            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);
                if (data.type === 'text' && typeof data.payload === 'string') {
                  accumulatedText += data.payload;
                  yield data.payload;
                }
              } catch {
                // Ignore JSON parse errors for non-text events
              }
            }
          }
        }
      } catch (error) {
        rejectOutput(error instanceof Error ? error : new Error(String(error)));
      } finally {
        reader.releaseLock();
      }
    })();

    return { stream, outputPromise };
  }
}
