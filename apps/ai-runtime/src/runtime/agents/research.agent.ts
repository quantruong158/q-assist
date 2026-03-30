import { LanguageModel, stepCountIs, ToolLoopAgent } from 'ai';

import { createSearchAgentSystemPrompt } from '../prompts';
import { ChatToolContext } from '../tools/context';
import { webSearchTool } from '../tools';

export interface CreateResearchAgentInput {
  model: LanguageModel;
  context: ChatToolContext;
}

export const createResearchAgent = (input: CreateResearchAgentInput) => {
  return new ToolLoopAgent({
    model: input.model,
    instructions: createSearchAgentSystemPrompt(),
    tools: {
      webSearch: webSearchTool,
    },
    experimental_context: input.context,
    stopWhen: stepCountIs(5),
  });
};
