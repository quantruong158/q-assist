import { createAiRuntimeApp } from './runtime/app';
import { createDefaultChatRuntimeHandler } from './runtime/chat-handler';
import { loadRuntimeConfig } from './runtime/config';

const config = loadRuntimeConfig();

const app = createAiRuntimeApp({
  config,
  chatHandler: createDefaultChatRuntimeHandler(),
});

Bun.serve({
  hostname: config.server.host,
  port: config.server.port,
  fetch: app.fetch,
  idleTimeout: 255,
});

console.info(`AI runtime listening on http://${config.server.host}:${config.server.port}`);
