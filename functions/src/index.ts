import { setGlobalOptions } from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
admin.firestore();

setGlobalOptions({ maxInstances: 10 });

import { onCallGenkit, onRequest } from 'firebase-functions/https';
import { chatFlow } from './genkit/chat-flow';
import { defineSecret } from 'firebase-functions/params';
import { notificationHandler } from './transactions/notificationHandler';

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
  { secrets: [notificationGatewayKey] },
  notificationHandler,
);
