import { Timestamp } from 'firebase/firestore';

export interface Attachment {
  url: string;
  mimeType: string;
  filename: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  createdAt: Timestamp;
  order: number;
}

export interface CreateMessageData {
  role: 'user' | 'assistant';
  content: string;
  order: number;
  attachments?: Attachment[];
}
