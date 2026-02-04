export interface AiModel {
  id: string;
  label: string;
  provider: string;
  supportSystemPrompt?: boolean;
  description?: string;
}

export const SUPPORTED_MODELS: AiModel[] = [
  {
    id: 'gemini-flash-lite-latest',
    label: 'Gemini Flash Lite',
    provider: 'Gemini',
    supportSystemPrompt: true,
  },
  {
    id: 'gemini-flash-latest',
    label: 'Gemini Flash',
    provider: 'Gemini',
    supportSystemPrompt: true,
  },
  {
    id: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    provider: 'Gemini',
    supportSystemPrompt: true,
  },
  {
    id: 'gemini-3-pro-preview',
    label: 'Gemini 3 Pro',
    provider: 'Gemini',
    supportSystemPrompt: true,
  },
  { id: 'gemma-3-4b-it', label: 'Gemma 3 4B', provider: 'Gemma', supportSystemPrompt: false },
  { id: 'gemma-3-27b-it', label: 'Gemma 3 27B', provider: 'Gemma', supportSystemPrompt: false },
];

export const DEFAULT_MODEL = SUPPORTED_MODELS[0];
