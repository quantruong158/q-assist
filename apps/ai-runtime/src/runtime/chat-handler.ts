import { DecodedIdToken } from 'firebase-admin/auth';
import { type ModelMessage } from 'ai';

import { ChatRequest, ChatResponse } from '@qos/chat/shared-models';

import { createMainAgent } from './agents';
import { AiRuntimeConfig } from './config';
import { resolveModel, resolveSupportedModelId } from './providers';
import {
  appendConversationMessage,
  deleteLastAssistantMessage,
  loadConversationModelMessages,
} from './chat-persistence';
import { ChatToolContext } from './tools/context';

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

type AttachmentPart =
  | {
      type: 'image';
      image: string;
      mediaType: string;
    }
  | {
      type: 'file';
      data: string;
      mediaType: string;
      filename?: string;
    };

type MessagePart =
  | {
      type: 'text';
      text: string;
    }
  | AttachmentPart;

const normalizeSessionId = (sessionId: string): string => {
  const trimmedSessionId = sessionId.trim();
  return trimmedSessionId.length > 0 ? trimmedSessionId : crypto.randomUUID();
};

const buildUserContent = (request: ChatRequest): string | MessagePart[] => {
  const attachments = request.attachments ?? [];
  if (attachments.length === 0) {
    return request.prompt;
  }

  const parts: MessagePart[] = [
    {
      type: 'text',
      text: request.prompt,
    },
  ];

  for (const attachment of attachments) {
    if (attachment.mimeType.startsWith('image/')) {
      parts.push({
        type: 'image',
        image: attachment.url,
        mediaType: attachment.mimeType,
      });
    } else {
      parts.push({
        type: 'file',
        data: attachment.url,
        mediaType: attachment.mimeType,
        filename: attachment.filename,
      });
    }
  }

  return parts;
};

const buildFallbackUserMessage = (request: ChatRequest): ModelMessage => ({
  role: 'user',
  content: buildUserContent(request),
});

const prepareConversationMessages = async (input: ChatRuntimeInput): Promise<ModelMessage[]> => {
  const sessionId = normalizeSessionId(input.request.sessionId);

  if (input.request.isRetry) {
    await deleteLastAssistantMessage(input.config, input.auth.uid, sessionId);

    const retryHistory = await loadConversationModelMessages(input.auth.uid, sessionId);

    const retryLastMessage = retryHistory[retryHistory.length - 1];
    if (!retryLastMessage || retryLastMessage.role !== 'user') {
      return [...retryHistory, buildFallbackUserMessage(input.request)];
    }

    return retryHistory;
  }

  await appendConversationMessage({
    userId: input.auth.uid,
    sessionId,
    role: 'user',
    content: input.request.prompt,
    attachments: input.request.attachments,
  });

  return loadConversationModelMessages(input.auth.uid, sessionId);
};

const createAgent = (input: ChatRuntimeInput) => {
  const modelId = resolveSupportedModelId(input.request.model);
  const model = resolveModel(input.config, modelId);
  const context: ChatToolContext = {
    auth: { uid: input.auth.uid },
  };

  return createMainAgent({ model, context });
};

const FALLBACK_TEXT = 'Sorry, an error occurred while processing your request.';

const runChat = async (
  mode: 'generate' | 'stream',
  input: ChatRuntimeInput,
): Promise<ChatResponse | AsyncIterable<ChatStreamEvent>> => {
  const agent = createAgent(input);
  const sessionId = normalizeSessionId(input.request.sessionId);
  const messages = await prepareConversationMessages({
    ...input,
    request: {
      ...input.request,
      sessionId,
    },
  });

  if (mode === 'generate') {
    try {
      const result = await agent.generate({ messages });

      if (result.text.trim().length > 0) {
        await appendConversationMessage({
          userId: input.auth.uid,
          sessionId,
          role: 'assistant',
          content: result.text,
        });
      }

      return {
        text: result.text,
        sessionId,
      };
    } catch (error) {
      console.error('AI runtime chat generation failed:', error);

      await appendConversationMessage({
        userId: input.auth.uid,
        sessionId,
        role: 'assistant',
        content: FALLBACK_TEXT,
      });

      return {
        text: FALLBACK_TEXT,
        sessionId,
      };
    }
  }

  return (async function* () {
    try {
      const result = await agent.stream({ messages });
      let accumulatedText = '';

      for await (const delta of result.textStream) {
        if (delta.length > 0) {
          accumulatedText += delta;
          yield {
            type: 'text',
            payload: delta,
          };
        }
      }

      if (accumulatedText.trim().length > 0) {
        await appendConversationMessage({
          userId: input.auth.uid,
          sessionId,
          role: 'assistant',
          content: accumulatedText,
        });
      }
    } catch (error) {
      console.error('AI runtime chat stream failed:', error);

      await appendConversationMessage({
        userId: input.auth.uid,
        sessionId,
        role: 'assistant',
        content: FALLBACK_TEXT,
      });

      yield {
        type: 'text',
        payload: FALLBACK_TEXT,
      };
    }
  })();
};

export const createDefaultChatRuntimeHandler = (): ChatRuntimeHandler => ({
  async respond(input) {
    const response = await runChat('generate', input);
    return response as ChatResponse;
  },
  async *stream(input) {
    const events = await runChat('stream', input);
    for await (const event of events as AsyncIterable<ChatStreamEvent>) {
      yield event;
    }
  },
});
