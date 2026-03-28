import { DecodedIdToken } from 'firebase-admin/auth';

import { ChatRequest, ChatResponse } from '@qos/chat/shared-models';

import { AiRuntimeConfig } from './config';

export interface ChatRuntimeInput {
  auth: DecodedIdToken;
  request: ChatRequest;
  config: AiRuntimeConfig;
}

export interface ChatStreamEvent {
  type: 'text';
  payload: string;
}

export interface ChatRuntimeHandler {
  respond(input: ChatRuntimeInput): Promise<ChatResponse>;
  stream(input: ChatRuntimeInput): AsyncIterable<ChatStreamEvent>;
}

const normalizeSessionId = (sessionId: string): string => {
  const trimmedSessionId = sessionId.trim();
  return trimmedSessionId.length > 0 ? trimmedSessionId : crypto.randomUUID();
};

export const createDefaultChatRuntimeHandler = (): ChatRuntimeHandler => ({
  async respond({ request }) {
    return {
      text: 'AI runtime scaffold is online. Streaming and tool calls can be wired in next.',
      sessionId: normalizeSessionId(request.sessionId),
    };
  },
  async *stream({ request }) {
    yield {
      type: 'text',
      payload: `AI runtime scaffold is online for session ${normalizeSessionId(request.sessionId)}.`,
    };
  },
});
