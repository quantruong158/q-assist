import type { ModelMessage } from 'ai';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { AiRuntimeConfig } from './config';

interface StoredChatAttachment {
  url: string;
  mimeType: string;
  filename?: string;
}

interface StoredChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: StoredChatAttachment[];
  order: number;
}

type UserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mediaType: string }
  | { type: 'file'; data: string; mediaType: string; filename?: string };

const DEFAULT_MESSAGE_LIMIT = 100;

const getMessagesCollection = (userId: string, sessionId: string) => {
  const db = getFirestore();
  return db.collection(`users/${userId}/conversations/${sessionId}/messages`);
};

const syncConversationSummary = async (userId: string, sessionId: string, isTemporary?: boolean): Promise<void> => {
  const messagesRef = getMessagesCollection(userId, sessionId);
  const snapshot = await messagesRef.orderBy('order', 'desc').limit(1).get();

  const db = getFirestore();
  const conversationRef = db.collection(`users/${userId}/conversations`).doc(sessionId);

  if (snapshot.empty) {
    await conversationRef.set(
      {
        ...(isTemporary !== undefined && { isTemporary }),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return;
  }

  const latestMessage = snapshot.docs[0].data() as StoredChatMessage;

  await conversationRef.set(
    {
      ...(isTemporary !== undefined && { isTemporary }),
      lastMessage: latestMessage.content,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

const buildUserContent = (
  content: string,
  attachments: StoredChatAttachment[] | undefined,
): string | UserContentPart[] => {
  if (!attachments || attachments.length === 0) {
    return content;
  }

  const parts: UserContentPart[] = [
    {
      type: 'text',
      text: content,
    },
  ];

  for (const attachment of attachments) {
    if (attachment.mimeType.startsWith('image/')) {
      parts.push({
        type: 'image',
        image: attachment.url,
        mediaType: attachment.mimeType,
      });
      continue;
    }

    parts.push({
      type: 'file',
      data: attachment.url,
      mediaType: attachment.mimeType,
      filename: attachment.filename,
    });
  }

  return parts;
};

const toModelMessage = (message: StoredChatMessage): ModelMessage => {
  if (message.role === 'assistant') {
    return {
      role: 'assistant',
      content: message.content,
    };
  }

  return {
    role: 'user',
    content: buildUserContent(message.content, message.attachments),
  };
};

export const loadConversationMessages = async (
  userId: string,
  sessionId: string,
  messageLimit = DEFAULT_MESSAGE_LIMIT,
): Promise<StoredChatMessage[]> => {
  const messagesRef = getMessagesCollection(userId, sessionId);
  const snapshot = await messagesRef.orderBy('order', 'desc').limit(messageLimit).get();

  return snapshot.docs.map((doc) => doc.data() as StoredChatMessage).reverse();
};

export const loadConversationModelMessages = async (
  userId: string,
  sessionId: string,
  messageLimit = DEFAULT_MESSAGE_LIMIT,
): Promise<ModelMessage[]> => {
  const messages = await loadConversationMessages(userId, sessionId, messageLimit);
  return messages.map(toModelMessage);
};

interface AppendMessageInput {
  userId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: StoredChatAttachment[];
  isTemporary?: boolean;
}

export const appendConversationMessage = async ({
  userId,
  sessionId,
  role,
  content,
  attachments,
  isTemporary,
}: AppendMessageInput): Promise<void> => {
  const messagesRef = getMessagesCollection(userId, sessionId);
  const lastMessageSnapshot = await messagesRef.orderBy('order', 'desc').limit(1).get();
  const lastOrder = lastMessageSnapshot.empty
    ? 0
    : Number(lastMessageSnapshot.docs[0].data()['order'] ?? 0);

  await messagesRef.add({
    role,
    content,
    order: lastOrder + 1,
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
    createdAt: FieldValue.serverTimestamp(),
  });

  await syncConversationSummary(userId, sessionId, isTemporary);
};

export const deleteLastAssistantMessage = async (
  config: AiRuntimeConfig,
  userId: string,
  sessionId: string,
): Promise<boolean> => {
  const messagesRef = getMessagesCollection(userId, sessionId);
  const snapshot = await messagesRef.orderBy('order', 'desc').limit(50).get();

  if (snapshot.empty) {
    await syncConversationSummary(userId, sessionId);
    return false;
  }

  const lastAssistantMessage = snapshot.docs.find((doc) => {
    const message = doc.data() as StoredChatMessage;
    return message.role === 'assistant';
  });

  if (!lastAssistantMessage) {
    await syncConversationSummary(userId, sessionId);
    return false;
  }

  await lastAssistantMessage.ref.delete();
  await syncConversationSummary(userId, sessionId);
  return true;
};
