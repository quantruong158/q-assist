import { z } from 'zod';

const firebaseServiceAccountSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  GCLOUD_PROJECT: z.string().min(1).optional(),
  GOOGLE_CLOUD_PROJECT: z.string().min(1).optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().min(1).optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().min(1).optional(),
});

const runtimeEnvSchema = firebaseServiceAccountSchema.extend({
  AI_RUNTIME_HOST: z.string().default('0.0.0.0'),
  AI_RUNTIME_PORT: z.coerce.number().int().positive().default(3000),
  AI_RUNTIME_CORS_ORIGIN: z.string().default('*'),
  GEMINI_API_KEY: z.string().min(1).optional(),
  OPENCODE_API_KEY: z.string().min(1).optional(),
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  TAVILY_API_KEY: z.string().min(1).optional(),
}).superRefine((value, ctx) => {
  const serviceAccountFields = [
    value.FIREBASE_PROJECT_ID,
    value.FIREBASE_CLIENT_EMAIL,
    value.FIREBASE_PRIVATE_KEY,
  ];
  const hasServiceAccountJson = Boolean(value.FIREBASE_SERVICE_ACCOUNT_JSON);
  const hasPartialServiceAccount = serviceAccountFields.some(Boolean) && !serviceAccountFields.every(Boolean);

  if (!hasServiceAccountJson && hasPartialServiceAccount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'Provide FIREBASE_SERVICE_ACCOUNT_JSON or all of FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.',
      path: ['FIREBASE_SERVICE_ACCOUNT_JSON'],
    });
  }
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;

export interface FirebaseAuthConfig {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
  serviceAccountJson?: string;
  authEmulatorHost?: string;
}

export interface AiRuntimeConfig {
  server: {
    host: string;
    port: number;
    corsOrigin: string;
  };
  firebaseAuth: FirebaseAuthConfig;
  aiSecrets: {
    geminiApiKey?: string;
    opencodeApiKey?: string;
    openrouterApiKey?: string;
    tavilyApiKey?: string;
  };
}

export const loadRuntimeConfig = (env: NodeJS.ProcessEnv = process.env): AiRuntimeConfig => {
  const parsed = runtimeEnvSchema.parse(env);

  return {
    server: {
      host: parsed.AI_RUNTIME_HOST,
      port: parsed.AI_RUNTIME_PORT,
      corsOrigin: parsed.AI_RUNTIME_CORS_ORIGIN,
    },
    firebaseAuth: {
      projectId:
        parsed.FIREBASE_PROJECT_ID ?? parsed.GCLOUD_PROJECT ?? parsed.GOOGLE_CLOUD_PROJECT,
      clientEmail: parsed.FIREBASE_CLIENT_EMAIL,
      privateKey: parsed.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      serviceAccountJson: parsed.FIREBASE_SERVICE_ACCOUNT_JSON,
      authEmulatorHost: parsed.FIREBASE_AUTH_EMULATOR_HOST,
    },
    aiSecrets: {
      geminiApiKey: parsed.GEMINI_API_KEY,
      opencodeApiKey: parsed.OPENCODE_API_KEY,
      openrouterApiKey: parsed.OPENROUTER_API_KEY,
      tavilyApiKey: parsed.TAVILY_API_KEY,
    },
  };
};

export const requiresFirebaseServiceAccount = (config: AiRuntimeConfig): boolean =>
  Boolean(
    config.firebaseAuth.serviceAccountJson ||
      (config.firebaseAuth.projectId &&
        config.firebaseAuth.clientEmail &&
        config.firebaseAuth.privateKey),
  );
