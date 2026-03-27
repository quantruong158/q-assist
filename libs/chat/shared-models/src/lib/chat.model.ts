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
  prompt: string;
  sessionId: string;
  model?: string;
  attachments?: Array<{
    url: string;
    mimeType: string;
  }>;
  isRetry: boolean;
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
