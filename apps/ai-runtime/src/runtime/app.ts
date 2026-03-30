import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ZodError } from 'zod';

import { ChatRequest } from '@qos/chat/shared-models';
import { DecodedIdToken } from 'firebase-admin/auth';

import { UnauthorizedError, verifyFirebaseBearerToken } from './auth';
import { AiRuntimeConfig } from './config';
import { ChatRuntimeHandler, createDefaultChatRuntimeHandler } from './chat-handler';
import { createFinanceChatHandler } from './finance-chat-handler';
import { chatRequestSchema } from './chat-request.schema';
import { RuntimeConfigError } from './errors';
import { createSseResponse } from './sse';

interface RuntimeVariables {
  authUserId: string;
  requestId: string;
}

interface RuntimeAppContext {
  Variables: RuntimeVariables;
}

export interface CreateAiRuntimeAppOptions {
  config: AiRuntimeConfig;
  chatHandler?: ChatRuntimeHandler;
}

const normalizeChatRequest = (request: unknown): ChatRequest => chatRequestSchema.parse(request);

export const createAiRuntimeApp = ({
  config,
  chatHandler = createDefaultChatRuntimeHandler(),
}: CreateAiRuntimeAppOptions): Hono<RuntimeAppContext> => {
  const app = new Hono<RuntimeAppContext>();
  const financeChatHandler = createFinanceChatHandler();

  app.use(
    '*',
    cors({
      origin: config.server.corsOrigin,
      allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
    }),
  );

  app.onError((error, c) => {
    if (error instanceof ZodError) {
      return c.json(
        {
          error: 'Invalid chat request',
          issues: error.flatten(),
        },
        400,
      );
    }

    if (error instanceof SyntaxError) {
      return c.json(
        {
          error: 'Invalid JSON body',
        },
        400,
      );
    }

    if (error instanceof UnauthorizedError) {
      return c.json(
        {
          error: error.message,
        },
        401,
      );
    }

    if (error instanceof RuntimeConfigError) {
      return c.json(
        {
          error: error.message,
        },
        503,
      );
    }

    return c.json(
      {
        error: 'Internal server error',
      },
      500,
    );
  });

  app.use('/api/*', async (c, next) => {
    const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();
    c.set('requestId', requestId);

    const authHeader = c.req.header('authorization');
    const decodedToken = await verifyFirebaseBearerToken(authHeader, config);

    c.set('authUserId', decodedToken.uid);

    await next();
    c.header('x-request-id', requestId);
  });

  app.get('/healthz', (c) => {
    return c.json({
      ok: true,
      service: 'ai-runtime',
    });
  });

  app.post('/api/chat', async (c) => {
    const body = normalizeChatRequest(await c.req.json());
    const authUserId = c.get('authUserId');

    const response = await chatHandler.respond({
      auth: { uid: authUserId } as DecodedIdToken,
      request: body,
      config,
    });

    return c.json(response);
  });

  app.post('/api/chat/stream', async (c) => {
    const body = normalizeChatRequest(await c.req.json());
    const authUserId = c.get('authUserId');

    const stream = chatHandler.stream({
      auth: { uid: authUserId } as DecodedIdToken,
      request: body,
      config,
    });

    return createSseResponse(stream);
  });

  app.post('/api/finance/chat', async (c) => {
    const body = normalizeChatRequest(await c.req.json());
    const authUserId = c.get('authUserId');

    const response = await financeChatHandler.respond({
      auth: { uid: authUserId } as DecodedIdToken,
      request: body,
      config,
    });

    return c.json(response);
  });

  return app;
};
