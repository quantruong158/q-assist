import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { ChatRequest, ChatResponse } from '@qos/chat/shared-models';
import { FinanceAiResponse } from '@qos/finance/shared-models';
import { API_BASE_URL } from '@qos/shared/util-angular';

@Injectable({ providedIn: 'root' })
export class FinanceAiService {
  private readonly auth = inject(Auth);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  async sendPrompt(prompt: string, sessionId: string): Promise<FinanceAiResponse> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const idToken = await user.getIdToken();
    const request: ChatRequest = { prompt, sessionId };

    const response = await fetch(`${this.apiBaseUrl}/api/finance/chat`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = (await response.json()) as ChatResponse;
    return { text: result.text, sessionId: result.sessionId };
  }
}
