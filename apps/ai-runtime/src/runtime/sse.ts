import { ChatStreamEvent } from './chat-handler';

const encode = new TextEncoder();

export const createSseResponse = (events: AsyncIterable<ChatStreamEvent>): Response => {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          controller.enqueue(encode.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
        controller.enqueue(encode.encode('event: done\ndata: {}\n\n'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
    },
  });
};
