import { Timestamp } from 'firebase/firestore';

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isTemporary?: boolean; // True = finance chat sessions, hidden from sidebar
}

export interface CreateConversationData {
  title: string;
  lastMessage: string;
}
