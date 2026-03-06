import { setGlobalOptions } from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
admin.firestore();

setGlobalOptions({ maxInstances: 10 });

import { onCallGenkit } from 'firebase-functions/https';
import { chatFlow } from './genkit/chat-flow';
import { defineSecret } from 'firebase-functions/params';

const geminiApiKey = defineSecret('GEMINI_API_KEY');

export const chat = onCallGenkit(
  {
    secrets: [geminiApiKey],
    authPolicy: (auth) => {
      if (!auth) {
        throw new Error('Unauthorized');
      }

      return true;
    },
  },
  chatFlow,
);
