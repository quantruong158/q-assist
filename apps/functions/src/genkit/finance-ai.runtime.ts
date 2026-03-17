import { googleAI } from '@genkit-ai/google-genai';
import { genkit } from 'genkit/beta';

export const financeAiGenkit = genkit({
  plugins: [googleAI()],
});
