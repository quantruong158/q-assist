import { setGlobalOptions } from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
admin.firestore().settings({
  ignoreUndefinedProperties: true,
});

setGlobalOptions({ maxInstances: 3 });

import { onCallGenkit, onRequest } from 'firebase-functions/https';
import { chatFlow } from './genkit/chat-flow';
import { financeAiFlow } from './genkit/finance-ai.flow';
import { defineSecret } from 'firebase-functions/params';
import { notificationHandler } from './finance/handlers/notificationHandler';
import * as balanceHandlers from './finance/handlers/balanceHandler';

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const notificationGatewayKey = defineSecret('NOTIFICATION_GATEWAY_KEY');
const opencodeApiKey = defineSecret('OPENCODE_API_KEY');
const openrouterApiKey = defineSecret('OPENROUTER_API_KEY');
const tavilyApiKey = defineSecret('TAVILY_API_KEY');

export const chat = onCallGenkit(
  {
    secrets: [geminiApiKey, opencodeApiKey, openrouterApiKey, tavilyApiKey],
    authPolicy: (auth) => {
      if (!auth) {
        throw new Error('Unauthorized');
      }

      return true;
    },
  },
  chatFlow,
);

export const financeAi = onCallGenkit(
  {
    secrets: [geminiApiKey, opencodeApiKey, openrouterApiKey],
    authPolicy: (auth) => {
      if (!auth) {
        throw new Error('Unauthorized');
      }

      return true;
    },
  },
  financeAiFlow,
);

export const processNotification = onRequest(
  { secrets: [notificationGatewayKey, geminiApiKey] },
  notificationHandler,
);

// Firestore triggers
export const onTransactionWrite = balanceHandlers.onTransactionWrite;
export const onMoneySourceWrite = balanceHandlers.onMoneySourceWrite;
