import { setGlobalOptions } from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
admin.firestore();

setGlobalOptions({ maxInstances: 3 });

import { onCallGenkit, onRequest } from 'firebase-functions/https';
import { chatFlow } from './genkit/chat-flow';
import { defineSecret } from 'firebase-functions/params';
import { notificationHandler } from './finance/handlers/notificationHandler';
import * as balanceHandlers from './finance/handlers/balanceHandler';

const geminiApiKey = defineSecret('GEMINI_API_KEY');
const notificationGatewayKey = defineSecret('NOTIFICATION_GATEWAY_KEY');

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

export const processNotification = onRequest(
  { secrets: [notificationGatewayKey, geminiApiKey] },
  notificationHandler,
);

// Firestore triggers
export const onTransactionWrite = balanceHandlers.onTransactionWrite;
export const onMoneySourceWrite = balanceHandlers.onMoneySourceWrite;
