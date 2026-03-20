import { googleAI } from '@genkit-ai/google-genai';
import { SessionData, SessionStore, z } from 'genkit';
import { logger } from 'firebase-functions';
import {
  createTransactionTool,
  FinanceAiToolContext,
  listMoneySourcesTool,
  updateLatestTransactionCategoryTool,
} from './finance-ai.tools';
import { financeAiGenkit } from './finance-ai.runtime';
import { getFirestore } from 'firebase-admin/firestore';

const financeAiActionResultSchema = z.object({
  message: z.string(),
  performedAction: z.enum(['added', 'updated', 'clarification', 'unsupported']),
  createdTransactionId: z.string().optional(),
  updatedTransactionId: z.string().optional(),
  requiresClarification: z.boolean().optional(),
  clarificationOptions: z.array(z.string()).optional(),
});

export const financeAiFlow = financeAiGenkit.defineFlow(
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

    const systemPrompt = `You are a finance assistant. Your task is to follow user's command to manage their finances, such as creating transactions, updating transaction categories.
      Use necessary tools to infer missing fields, or interact with the user to complete the transaction.`;

    const store = new FirestoreSessionStore(userId);
    const chatContext: FinanceAiToolContext = {
      auth: { uid: userId },
    };

    const session =
      sessionId.length === 0
        ? financeAiGenkit.createSession({ store })
        : await financeAiGenkit.loadSession(sessionId, { store });

    const chat = session.chat({
      model: googleAI.model('gemini-3.1-flash-lite-preview'),
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

export class FirestoreSessionStore<S> implements SessionStore<S> {
  constructor(private readonly userId: string) {}

  async get(sessionId: string): Promise<SessionData<S> | undefined> {
    const db = getFirestore();
    const doc = await db.collection(`users/${this.userId}/genkit_sessions`).doc(sessionId).get();
    return doc.exists ? (doc.data() as SessionData<S>) : undefined;
  }

  async save(sessionId: string, sessionData: SessionData<S>): Promise<void> {
    const db = getFirestore();
    await db.collection(`users/${this.userId}/genkit_sessions`).doc(sessionId).set(sessionData);
  }
}
