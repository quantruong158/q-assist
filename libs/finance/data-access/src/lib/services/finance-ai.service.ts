import { inject, Injectable } from '@angular/core';
import { Functions } from '@angular/fire/functions';
import { httpsCallable } from 'firebase/functions';
import { FinanceAiRequest, FinanceAiResponse } from '@qos/finance/shared-models';

@Injectable({ providedIn: 'root' })
export class FinanceAiService {
  private readonly functions = inject(Functions);

  async sendPrompt(prompt: string, sessionId: string): Promise<FinanceAiResponse> {
    const financeAiEndpoint = httpsCallable<FinanceAiRequest, FinanceAiResponse>(
      this.functions,
      'financeAi',
    );

    const result = await financeAiEndpoint({ prompt, sessionId });
    return result.data;
  }
}
