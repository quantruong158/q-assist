import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createAnthropic } from '@ai-sdk/anthropic';

import { DEFAULT_MODEL, SUPPORTED_MODELS } from '@qos/shared/models';

import { AiRuntimeConfig } from '../config';
import { RuntimeConfigError } from '../errors';

const OPENCODE_GO_BASE_URL = 'https://opencode.ai/zen/go/v1';
const OPENCODE_ZEN_BASE_URL = 'https://opencode.ai/zen/v1';

const requireSecret = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new RuntimeConfigError(`${name} is required for the selected model`);
  }

  return value;
};

export type SupportedModelId = (typeof SUPPORTED_MODELS)[number]['id'];

export const resolveSupportedModelId = (modelId?: string): SupportedModelId => {
  const selectedModel = SUPPORTED_MODELS.find((model) => model.id === modelId);
  return selectedModel?.id ?? DEFAULT_MODEL.id;
};

export const resolveModel = (config: AiRuntimeConfig, modelId: SupportedModelId) => {
  const opencodeGo = createOpenAICompatible({
    name: 'opencode-go',
    apiKey: requireSecret(config.aiSecrets.opencodeApiKey, 'OPENCODE_API_KEY'),
    baseURL: OPENCODE_GO_BASE_URL,
    includeUsage: true,
  });

  const opencodeGoAnthropic = createAnthropic({
    name: 'opencode-go-anthropic',
    apiKey: requireSecret(config.aiSecrets.opencodeApiKey, 'OPENCODE_API_KEY'),
    baseURL: OPENCODE_GO_BASE_URL,
  });

  const opencodeZen = createOpenAICompatible({
    name: 'opencode-zen',
    apiKey: requireSecret(config.aiSecrets.opencodeApiKey, 'OPENCODE_API_KEY'),
    baseURL: OPENCODE_ZEN_BASE_URL,
    includeUsage: true,
  });

  const openrouter = createOpenRouter({
    apiKey: requireSecret(config.aiSecrets.openrouterApiKey, 'OPENROUTER_API_KEY'),
  });

  const googleProvider = () =>
    createGoogleGenerativeAI({
      apiKey: requireSecret(config.aiSecrets.geminiApiKey, 'GEMINI_API_KEY'),
    });

  switch (modelId) {
    case 'googleai/gemini-2.5-flash-lite':
      return googleProvider()('gemini-2.5-flash-lite');
    case 'googleai/gemini-3-flash-preview':
      return googleProvider()('gemini-3-flash-preview');
    case 'googleai/gemini-3.1-flash-lite-preview':
      return googleProvider()('gemini-3.1-flash-lite-preview');
    case 'openrouter/nvidia/nemotron-3-nano-30b-a3b:free':
      return openrouter.chat('nvidia/nemotron-3-nano-30b-a3b:free');
    case 'openrouter/arcee-ai/trinity-large-preview:free':
      return openrouter.chat('arcee-ai/trinity-large-preview:free');
    case 'opencode-go/glm-5':
      return opencodeGo('glm-5');
    case 'opencode-go/kimi-k2.5':
      return opencodeGo('kimi-k2.5');
    case 'opencode-go/minimax-m2.5':
      return opencodeGoAnthropic('minimax-m2.5');
    case 'opencode-go/minimax-m2.7':
      return opencodeGoAnthropic('minimax-m2.7');
    case 'opencode-zen/minimax-m2.5-free':
      return opencodeZen('minimax-m2.5-free');
    default:
      return googleProvider()('gemini-2.5-flash-lite');
  }
};
