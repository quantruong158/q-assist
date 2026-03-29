import { DecodedIdToken } from 'firebase-admin/auth';
import { stepCountIs, ToolLoopAgent, type ModelMessage, type ToolSet } from 'ai';

import { ChatRequest, ChatResponse } from '@qos/chat/shared-models';

import { AiRuntimeConfig } from './config';
import { CHAT_SYSTEM_PROMPT, TOOL_GUIDANCE } from './prompts';
import { resolveModel, resolveSupportedModelId } from './providers';
import {
  appendConversationMessage,
  deleteLastAssistantMessage,
  loadConversationModelMessages,
} from './chat-persistence';
import {
  createTransactionTool,
  listMoneySourcesTool,
  updateLatestTransactionCategoryTool,
  webSearchTool,
} from './tools';
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

const ALL_TOOLS: ToolSet = {
  webSearchTool,
  listMoneySourcesTool,
  createTransactionTool,
  updateLatestTransactionCategoryTool,
};

const buildInstructions = (): string => [CHAT_SYSTEM_PROMPT, TOOL_GUIDANCE].join('\n\n');

const logRequestSummary = (event: {
  experimental_context: unknown;
  steps: Array<{
    toolCalls: Array<{
      toolName: string;
    }>;
  }>;
}) => {
  const context = event.experimental_context as ChatToolContext | undefined;
  const userId = context?.auth.uid ?? 'unknown';
  const toolsCalled = [
    ...new Set(event.steps.flatMap((step) => step.toolCalls.map((toolCall) => toolCall.toolName))),
  ];

  console.info(
    JSON.stringify({
      userId,
      toolsCalled,
    }),
  );
};

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
  const experimentalContext: ChatToolContext = {
    auth: { uid: input.auth.uid },
    config: {
      aiSecrets: input.config.aiSecrets,
    },
  };

  return new ToolLoopAgent({
    model,
    instructions: buildInstructions(),
    tools: ALL_TOOLS,
    experimental_context: experimentalContext,
    stopWhen: stepCountIs(5),
    onFinish: logRequestSummary,
  });
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
