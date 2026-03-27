import { openAICompatible } from '@genkit-ai/compat-oai';

export const opencodeGo = openAICompatible({
  name: 'opencode-go',
  apiKey: process.env.OPENCODE_API_KEY,
  baseURL: 'https://opencode.ai/zen/go/v1',
});

export const opencodeZen = openAICompatible({
  name: 'opencode-zen',
  apiKey: process.env.OPENCODE_API_KEY,
  baseURL: 'https://opencode.ai/zen/v1',
});
