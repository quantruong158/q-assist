export interface ChatAttachment {
  url: string;
  mimeType: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  conversationId?: string;
}

export interface ChatResponse {
  response: string;
}

export interface ChatSessionState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  isLoaded: boolean;
  isLoading: boolean;
  activeStreamRequestId?: string;
  activeLoadRequestId?: string;
  error?: string;
}
