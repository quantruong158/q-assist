import { LanguageModel, stepCountIs, ToolLoopAgent } from 'ai';

import { FINANCE_AGENT_SYSTEM_PROMPT } from '../prompts';
import { ChatToolContext } from '../tools/context';
import {
  createTransactionTool,
  listMoneySourcesTool,
  updateLatestTransactionCategoryTool,
} from '../tools';
import { logRequestSummary } from '../util';

export interface CreateFinanceAgentInput {
  model: LanguageModel;
  context: ChatToolContext;
}

export const createFinanceAgent = (input: CreateFinanceAgentInput) => {
  return new ToolLoopAgent({
    model: input.model,
    instructions: FINANCE_AGENT_SYSTEM_PROMPT,
    tools: {
      listMoneySources: listMoneySourcesTool,
      createTransaction: createTransactionTool,
      updateLatestTransactionCategory: updateLatestTransactionCategoryTool,
    },
    experimental_context: input.context,
    stopWhen: stepCountIs(3),
    onFinish: logRequestSummary,
  });
};
