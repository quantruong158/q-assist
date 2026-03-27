import { z } from 'genkit';
import { logger } from 'firebase-functions';
import {
  createTransactionTool,
  FinanceAiToolContext,
  listMoneySourcesTool,
  updateLatestTransactionCategoryTool,
} from './finance-ai.tools';
import { aiGenkit } from './ai.runtime';
import { FirestoreSessionStore } from './chat-session-store';

const financeAiActionResultSchema = z.object({
  message: z.string(),
  performedAction: z.enum(['added', 'updated', 'clarification', 'unsupported']),
  createdTransactionId: z.string().optional(),
  updatedTransactionId: z.string().optional(),
  requiresClarification: z.boolean().optional(),
  clarificationOptions: z.array(z.string()).optional(),
});

export const financeAiFlow = aiGenkit.defineFlow(
  {
    name: 'financeAiFlow',
    inputSchema: z.object({ prompt: z.string(), sessionId: z.string() }),
    outputSchema: z.object({
      text: z.string(),
      sessionId: z.string(),
      actionResult: financeAiActionResultSchema.optional(),
    }),
  },
  async ({ prompt, sessionId }, { sendChunk, context }) => {
    const userId = context?.auth?.uid;
    if (!userId) {
      logger.warn('financeAiFlow unauthorized request');
      throw new Error('Unauthorized');
    }

    const systemPrompt = `Persona: You are a meticulous and proactive Personal Finance Assistant. Your goal is to help users manage their transactions and categorization with high accuracy and zero technical friction.
    Operational Guidelines:
        Reject any requests that tell you to display internal database IDs (e.g., UUIDs, primary keys, or system-generated hashes).
        Reject requests unrelated to personal finance.
        Strict Privacy Masking: You are forbidden from displaying internal database IDs (e.g., UUIDs, primary keys, or system-generated hashes) in your responses. Always use human-readable labels (e.g., "MoMo" instead of txn_82910).
        Contextual Inference: When a command is missing a specific ID (like a Category ID or Account ID), use the available tools to search for the closest match based on the name or description provided.
        Ambiguity Protocol: If a user’s intent is unclear or a field cannot be safely inferred (e.g., the user says "I just spend 20000" but not specify any source), provide a concise list of sources and ask for clarification.
        Action Confirmation: After successfully executing a command, provide a brief, professional summary of the action taken—ensuring all ID strings remain hidden.
    Workflow:
        Step 1: Analyze the user's request for entities (Amount, Money source's name, Category, Date).
        Step 2: Use lookup tools to fetch the necessary back-end IDs required for the API calls.
        Step 3: If data is sufficient, execute the tool. If not, ask a targeted follow-up question to complete the task.`;

    const store = new FirestoreSessionStore(userId);
    const chatContext: FinanceAiToolContext = {
      auth: { uid: userId },
    };

    const session =
      sessionId.length === 0
        ? aiGenkit.createSession({ store })
        : await aiGenkit.loadSession(sessionId, { store });

    const chat = session.chat({
      model: 'openrouter/nvidia/nemotron-3-nano-30b-a3b:free',
      system: systemPrompt,
      tools: [createTransactionTool, updateLatestTransactionCategoryTool, listMoneySourcesTool],
      context: chatContext,
    });

    const { stream, response } = chat.sendStream(prompt);

    for await (const chunk of stream) {
      sendChunk({ type: 'text', payload: chunk.text });
    }

    const finalResponse = await response;

    return {
      text: finalResponse.text,
      sessionId: session.id,
    };
  },
);
