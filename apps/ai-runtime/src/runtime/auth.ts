import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import {
  App,
  ServiceAccount,
  applicationDefault,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';

import { AiRuntimeConfig } from './config';

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

let firebaseApp: App | undefined;

const parseServiceAccount = (config: AiRuntimeConfig): ServiceAccount | undefined => {
  if (config.firebaseAuth.serviceAccountJson) {
    return JSON.parse(config.firebaseAuth.serviceAccountJson) as ServiceAccount;
  }

  if (
    config.firebaseAuth.projectId &&
    config.firebaseAuth.clientEmail &&
    config.firebaseAuth.privateKey
  ) {
    return {
      projectId: config.firebaseAuth.projectId,
      clientEmail: config.firebaseAuth.clientEmail,
      privateKey: config.firebaseAuth.privateKey,
    };
  }

  return undefined;
};

export const getFirebaseAdminApp = (config: AiRuntimeConfig): App => {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    return firebaseApp;
  }

  const serviceAccount = parseServiceAccount(config);
  if (serviceAccount) {
    firebaseApp = initializeApp({ credential: cert(serviceAccount) });
    return firebaseApp;
  }

  firebaseApp = config.firebaseAuth.projectId
    ? initializeApp({
        projectId: config.firebaseAuth.projectId,
        credential: applicationDefault(),
      })
    : initializeApp({
        credential: applicationDefault(),
      });

  return firebaseApp;
};

export const verifyFirebaseBearerToken = async (
  authorizationHeader: string | undefined,
  config: AiRuntimeConfig,
): Promise<DecodedIdToken> => {
  const match = authorizationHeader?.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    throw new UnauthorizedError('Missing bearer token');
  }

  const token = match[1].trim();
  if (token.length === 0) {
    throw new UnauthorizedError('Missing bearer token');
  }

  const auth = getAuth(getFirebaseAdminApp(config));

  try {
    return await auth.verifyIdToken(token);
  } catch (error) {
    throw new UnauthorizedError(error instanceof Error ? error.message : 'Invalid bearer token');
  }
};
