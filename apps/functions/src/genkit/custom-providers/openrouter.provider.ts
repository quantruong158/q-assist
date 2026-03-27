import { openAICompatible } from '@genkit-ai/compat-oai';

export const openrouter = openAICompatible({
  name: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});
