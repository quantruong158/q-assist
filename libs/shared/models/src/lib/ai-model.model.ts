export interface AiModel {
  id: string;
  label: string;
  provider: string;
  description?: string;
}

export const SUPPORTED_MODELS: AiModel[] = [
  {
    id: 'googleai/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    provider: 'Gemini',
  },
  {
    id: 'googleai/gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    provider: 'Gemini',
  },
  {
    id: 'googleai/gemini-3.1-flash-lite-preview',
    label: 'Gemini 3.1 Flash Lite',
    provider: 'Gemini',
  },
  {
    id: 'openrouter/arcee-ai/trinity-large-preview:free',
    label: 'Trinity Large Preview',
    provider: 'OpenRouter',
  },
  {
    id: 'openrouter/nvidia/nemotron-3-nano-30b-a3b:free',
    label: 'Nemotron 3 Nano 30B',
    provider: 'OpenRouter',
  },
  {
    id: 'opencode-go/glm-5',
    label: 'GLM-5',
    provider: 'Opencode Go',
  },
  {
    id: 'opencode-go/kimi-k2.5',
    label: 'Kimi-K2.5',
    provider: 'Opencode Go',
  },
  {
    id: 'opencode-go/minimax-m2.5',
    label: 'MiniMax M2.5',
    provider: 'Opencode Go',
  },
  {
    id: 'opencode-go/minimax-m2.7',
    label: 'MiniMax M2.7',
    provider: 'Opencode Go',
  },
  {
    id: 'opencode-zen/minimax-m2.5-free',
    label: 'MiniMax M2.5',
    provider: 'Opencode Zen',
  },
];

export const DEFAULT_MODEL = SUPPORTED_MODELS[0];
