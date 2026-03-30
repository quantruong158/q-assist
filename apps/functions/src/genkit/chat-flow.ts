import { Part, z } from 'genkit/beta';
import { DEFAULT_MODEL, SUPPORTED_MODELS } from '@qos/shared/models';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { FirestoreSessionStore } from './chat-session-store';
import { FinanceAiToolContext } from './finance-ai.tools';
import { aiGenkit } from './ai.runtime';
import { logger } from 'firebase-functions/logger';
import { financeAgent, searchAgent } from './agents';

const ChatInputSchema = z.object({
  prompt: z.string(),
  sessionId: z.string(),
  model: z.string().optional(),
  attachments: z
    .array(
      z.object({
        url: z.string(),
        mimeType: z.string(),
      }),
    )
    .optional()
    .nullable(),
  isRetry: z.boolean().optional(),
});

const ChatOutputSchema = z.object({
  text: z.string(),
  sessionId: z.string(),
});

const SYSTEM_PROMPT = `You are a helpful and knowledgeable AI assistant. Your role is to provide clear, accurate, and supportive information to the user.

Guidelines:
- Always answer in the same language as the user.
- Respond in a professional and friendly tone.
- Provide accurate and well-structured information.
- Use markdown formatting (lists, bold for emphasis) to improve readability.
- If you don't know the answer, state it clearly and suggest where the user might find the information.
- Maintain a neutral and objective perspective.
- If appropriate, transfer to an agent that can better handle the request. If you cannot help the customer with the available tools, politely explain so.

IMPORTANT DISCLAIMER: You are an AI assistant and cannot provide professional, legal, or medical advice. Always encourage users to consult with qualified professionals for specific concerns.`;

export const chatFlow = aiGenkit.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
    streamSchema: z.string(),
  },
  async ({ prompt, sessionId, model, attachments, isRetry }, { sendChunk, context }) => {
    const userId = context?.auth?.uid;
    if (!userId) {
      throw new Error('Unauthorized');
    }

    try {
      const selectedModel = SUPPORTED_MODELS.find((m) => m.id === model);
      const targetModel = selectedModel ?? DEFAULT_MODEL;

      const store = new FirestoreSessionStore(userId);
      const session =
        sessionId.length === 0
          ? aiGenkit.createSession({ store, sessionId })
          : await aiGenkit.loadSession(sessionId, { store });

      if (isRetry && sessionId.length > 0) {
        const sessionData = await store.get(sessionId);
        const threads = sessionData?.threads;
        if (threads && threads.main && threads.main.length > 0) {
          let lastUserMessageIndex = -1;
          for (let i = threads.main.length - 1; i >= 0; i--) {
            if (threads.main[i].role === 'user') {
              lastUserMessageIndex = i;
              break;
            }
          }

          if (lastUserMessageIndex >= 0) {
            const slicedMessages = threads.main.slice(0, lastUserMessageIndex);
            await session.updateMessages('main', slicedMessages);
          }
        }
      }

      const chatContext: FinanceAiToolContext = {
        auth: { uid: userId },
      };

      const chat = session.chat({
        model: targetModel.id,
        system: SYSTEM_PROMPT,
        tools: [searchAgent, financeAgent],
        context: chatContext,
      });

      const contentParts: Part[] = [{ text: prompt }];

      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          contentParts.push({
            media: {
              url: att.url,
              contentType: att.mimeType,
            },
          });
        }
      }

      const { stream, response } = chat.sendStream(contentParts);

      for await (const chunk of stream) {
        const text = chunk.text;
        if (text) {
          sendChunk(text);
        }
      }

      const { text } = await response;

      if (text) {
        try {
          await appendChatMessage(userId, sessionId, 'assistant', text);
        } catch (error) {
          logger.error('Error saving assistant message to Firestore:', error);
        }
      }

      return { text, sessionId };
    } catch (error) {
      logger.error('Error while processing chat flow:', error);

      const fallbackText = 'Sorry, an error occurred while processing your request.';

      try {
        sendChunk(fallbackText);
        await appendChatMessage(userId, sessionId, 'assistant', fallbackText);
      } catch (appendError) {
        logger.error('Error saving fallback assistant message to Firestore:', appendError);
      }

      return { text: fallbackText, sessionId };
    }
  },
);

const appendChatMessage = async (
  userId: string,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
) => {
  const db = getFirestore();
  const messagesRef = db.collection(`users/${userId}/conversations/${sessionId}/messages`);
  const conversationRef = db.collection(`users/${userId}/conversations`).doc(sessionId);
  const lastMessageSnapshot = await messagesRef.orderBy('order', 'desc').limit(1).get();
  const lastOrder = lastMessageSnapshot.empty ? 0 : lastMessageSnapshot.docs[0].data()['order'];

  await messagesRef.add({
    role,
    content,
    order: lastOrder + 1,
    createdAt: FieldValue.serverTimestamp(),
  });

  await conversationRef.set(
    {
      lastMessage: content,
      updatedAt: FieldValue.serverTimestamp(),
      isTemporary: false,
    },
    { merge: true },
  );
};
