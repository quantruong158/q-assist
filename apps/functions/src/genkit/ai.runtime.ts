import { genkit } from 'genkit/beta';
import { opencodeGo, opencodeZen } from './custom-providers/opencode.provider';
import { openrouter } from './custom-providers/openrouter.provider';
import { googleAI } from '@genkit-ai/google-genai';

export const aiGenkit = genkit({
  plugins: [opencodeGo, opencodeZen, openrouter, googleAI()],
});
