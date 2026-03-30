import { ChatToolContext } from './tools/context';

export const logRequestSummary = (event: {
  experimental_context: unknown;
  steps: Array<{
    toolCalls: Array<{
      toolName: string;
    }>;
  }>;
}) => {
  const context = event.experimental_context as ChatToolContext | undefined;
  const userId = context?.auth.uid ?? 'unknown';
  const toolsCalled = [
    ...new Set(event.steps.flatMap((step) => step.toolCalls.map((toolCall) => toolCall.toolName))),
  ];

  console.info(
    JSON.stringify({
      userId,
      toolsCalled,
    }),
  );
};
