import { googleAI } from '@genkit-ai/google-genai';
import { genkit, Part, z } from 'genkit';
import { DEFAULT_MODEL, SUPPORTED_MODELS } from '@qos/shared/models';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const ai = genkit({
  plugins: [googleAI()],
});

const AttachmentSchema = z.object({
  url: z.string(),
  mimeType: z.string(),
});

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  attachments: z.array(AttachmentSchema).optional().nullable(),
});

const ChatInputSchema = z.object({
  messages: z.array(MessageSchema),
  model: z.string().optional(),
  conversationId: z.string().optional(),
});

const ChatOutputSchema = z.object({
  response: z.string(),
});

const SYSTEM_PROMPT = `You are a helpful and knowledgeable AI assistant. Your role is to provide clear, accurate, and supportive information to the user.

Guidelines:
- Always answer in the same language as the user.
- Respond in a professional and friendly tone.
- Provide accurate and well-structured information.
- Use markdown formatting (lists, bold for emphasis) to improve readability.
- If you don't know the answer, state it clearly and suggest where the user might find the information.
- Maintain a neutral and objective perspective.

IMPORTANT DISCLAIMER: You are an AI assistant and cannot provide professional, legal, or medical advice. Always encourage users to consult with qualified professionals for specific concerns.`;

export const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
    streamSchema: z.string(),
  },
  async ({ messages, model, conversationId }, { sendChunk, context }) => {
    const selectedModel =
      model && SUPPORTED_MODELS.find((m) => m.id === model) ? model : DEFAULT_MODEL.id;

    const isModelSupportSystemPrompt = SUPPORTED_MODELS.find(
      (m) => m.id === selectedModel,
    ).supportSystemPrompt;

    const genkitMessages = await Promise.all(
      messages.map(async (msg) => {
        const contentParts: Part[] = [{ text: msg.content }];

        if (msg.attachments && msg.attachments.length > 0) {
          for (const att of msg.attachments) {
            const base64Data = await fetchImageAsBase64(att.url);
            contentParts.push({
              media: {
                url: `data:${att.mimeType};base64,${base64Data}`,
                contentType: att.mimeType,
              },
            });
          }
        }

        return {
          role: (msg.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
          content: contentParts,
        };
      }),
    );

    if (!isModelSupportSystemPrompt) {
      genkitMessages.unshift({ role: 'user', content: [{ text: SYSTEM_PROMPT }] });
    }

    const { stream, response } = ai.generateStream({
      model: googleAI.model(selectedModel),
      system: isModelSupportSystemPrompt ? SYSTEM_PROMPT : undefined,
      messages: genkitMessages,
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        sendChunk(text);
      }
    }

    const { text } = await response;

    if (text && conversationId && context?.auth) {
      const userId = context.auth.uid;
      const db = getFirestore();
      try {
        const messagesRef = db.collection(
          `users/${userId}/conversations/${conversationId}/messages`,
        );
        const lastMessageSnapshot = await messagesRef.orderBy('order', 'desc').limit(1).get();
        const order = lastMessageSnapshot.empty
          ? 0
          : lastMessageSnapshot.docs[0].data()['order'] + 1;

        await messagesRef.add({
          role: 'assistant',
          content: text,
          order,
          createdAt: FieldValue.serverTimestamp(),
        });

        const conversationRef = db.doc(`users/${userId}/conversations/${conversationId}`);
        await conversationRef.set(
          {
            lastMessage: text.substring(0, 100),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      } catch (error) {
        console.error('Error saving assistant message to Firestore:', error);
      }
    }

    return { response: text };
  },
);

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}
