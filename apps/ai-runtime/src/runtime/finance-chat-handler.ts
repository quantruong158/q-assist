import { DecodedIdToken } from 'firebase-admin/auth';
import { type ModelMessage } from 'ai';

import { ChatRequest, ChatResponse } from '@qos/chat/shared-models';
import { AiRuntimeConfig } from './config';
import { resolveModel } from './providers';
import { appendConversationMessage, loadConversationModelMessages } from './chat-persistence';
import { createFinanceAgent } from './agents/finance.agent';
import { ChatToolContext } from './tools/context';

export interface FinanceChatInput {
  auth: DecodedIdToken;
  request: ChatRequest;
  config: AiRuntimeConfig;
}

export interface FinanceChatHandler {
  respond(input: FinanceChatInput): Promise<ChatResponse>;
}

const FALLBACK_TEXT = 'Sorry, an error occurred while processing your request.';

const normalizeSessionId = (sessionId: string | undefined): string => {
  if (sessionId && sessionId.trim().length > 0) {
    return sessionId.trim();
  }
  return crypto.randomUUID();
};

export const createFinanceChatHandler = (): FinanceChatHandler => ({
  async respond(input) {
    const modelId = 'opencode-go/glm-5';
    const model = resolveModel(input.config, modelId);
    const context: ChatToolContext = { auth: { uid: input.auth.uid } };
    const agent = createFinanceAgent({ model, context });

    const sessionId = normalizeSessionId(input.request.sessionId);
    const messages = await loadConversationModelMessages(input.auth.uid, sessionId);

    const userMessage: ModelMessage = { role: 'user', content: input.request.prompt };
    const allMessages = [...messages, userMessage];

    await appendConversationMessage({
      userId: input.auth.uid,
      sessionId,
      role: 'user',
      content: input.request.prompt,
      attachments: input.request.attachments,
    });

    try {
      const result = await agent.generate({ messages: allMessages });
      const text = result.text.trim().length > 0 ? result.text : FALLBACK_TEXT;

      await appendConversationMessage({
        userId: input.auth.uid,
        sessionId,
        role: 'assistant',
        content: text,
      });

      return { text, sessionId };
    } catch (error) {
      console.error('Finance chat handler error:', error);

      await appendConversationMessage({
        userId: input.auth.uid,
        sessionId,
        role: 'assistant',
        content: FALLBACK_TEXT,
      });

      return { text: FALLBACK_TEXT, sessionId };
    }
  },
});
