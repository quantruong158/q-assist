import { DecodedIdToken } from 'firebase-admin/auth';
import { stepCountIs, ToolLoopAgent, type ToolSet } from 'ai';

import { ChatRequest, ChatResponse } from '@qos/chat/shared-models';

import { AiRuntimeConfig } from './config';
import { CHAT_SYSTEM_PROMPT, TOOL_GUIDANCE } from './prompts';
import { resolveModel, resolveSupportedModelId } from './providers';
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
      });
    }
  }

  return parts;
};

const createAgentMessages = (request: ChatRequest) => [
  {
    role: 'user' as const,
    content: buildUserContent(request),
  },
];

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
  const messages = createAgentMessages(input.request);

  if (mode === 'generate') {
    try {
      const result = await agent.generate({ messages });

      return {
        text: result.text,
        sessionId: normalizeSessionId(input.request.sessionId),
      };
    } catch (error) {
      console.error('AI runtime chat generation failed:', error);

      return {
        text: FALLBACK_TEXT,
        sessionId: normalizeSessionId(input.request.sessionId),
      };
    }
  }

  return (async function* () {
    try {
      const result = await agent.stream({ messages });

      for await (const delta of result.textStream) {
        if (delta.length > 0) {
          yield {
            type: 'text',
            payload: delta,
          };
        }
      }
    } catch (error) {
      console.error('AI runtime chat stream failed:', error);
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
