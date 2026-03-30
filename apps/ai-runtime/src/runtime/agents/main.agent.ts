import { InferAgentUIMessage, LanguageModel, stepCountIs, tool, ToolLoopAgent } from 'ai';
import { z } from 'zod';

import { ChatToolContext } from '../tools/context';
import { createFinanceAgent } from './finance.agent';
import { createResearchAgent } from './research.agent';

export const MAIN_AGENT_PROMPT = `You are a helpful and knowledgeable AI assistant.

Route requests appropriately:

- For personal finance (transactions, money sources, categories): use financeSubagent
- For research, facts, news, current events: use researchSubagent
- For general questions: answer directly without using tools

Always match the user's language. Be concise and helpful.

Use markdown when it improves readability.

If a request is unclear, ask for clarification. If a request falls outside finance or research scope
and you cannot help, politely explain so.

Do not reveal internal IDs, tool names, agent names to the user.

IMPORTANT DISCLAIMER: You are an AI assistant and cannot provide professional, legal, or medical
advice. Encourage users to consult qualified professionals for specific concerns.`;

export interface CreateMainAgentInput {
  model: LanguageModel;
  context: ChatToolContext;
}

export const createMainAgent = (input: CreateMainAgentInput) => {
  const financeAgent = createFinanceAgent(input);
  const researchAgent = createResearchAgent(input);

  const financeSubagentTool = tool({
    description:
      'Handle personal finance requests: transactions, money sources, categories. Use for any finance-related queries.',
    inputSchema: z.object({
      task: z.string().describe('The finance task to execute'),
    }),
    execute: async ({ task }, { abortSignal }) => {
      const result = await financeAgent.generate({
        prompt: task,
        abortSignal,
      });
      return result.text;
    },
  });

  const researchSubagentTool = tool({
    description:
      'Research topics using web search. Use for current facts, news, technical queries, time-sensitive information.',
    inputSchema: z.object({
      task: z.string().describe('The research task to complete'),
    }),
    execute: async ({ task }, { abortSignal }) => {
      const result = await researchAgent.generate({
        prompt: task,
        abortSignal,
      });
      return result.text;
    },
  });

  return new ToolLoopAgent({
    model: input.model,
    instructions: MAIN_AGENT_PROMPT,
    tools: {
      financeSubagent: financeSubagentTool,
      researchSubagent: researchSubagentTool,
    },
    experimental_context: input.context,
    stopWhen: stepCountIs(5),
    onFinish: logRequestSummary,
  });
};

const logRequestSummary = (event: {
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

export type ChatAgentUIMessage = InferAgentUIMessage<ReturnType<typeof createMainAgent>>;
