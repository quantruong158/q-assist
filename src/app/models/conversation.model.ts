import { Timestamp } from 'firebase/firestore';

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateConversationData {
  title: string;
  lastMessage: string;
}
