import type {
  ApiError,
  AssistantMessage,
  ContextOverflowError,
  Event,
  FileDiff,
  FilePart,
  Message,
  MessageAbortedError,
  MessageOutputLengthError,
  Part,
  ProviderAuthError,
  Session,
  SessionStatus,
  StepFinishPart,
  StepStartPart,
  StructuredOutputError,
  SubtaskPart,
  TextPart,
  ToolPart,
  ToolState,
  ToolStateCompleted,
  ToolStatePending,
  UnknownError,
  UserMessage,
  ReasoningPart,
} from '@opencode-ai/sdk/v2';

export type OpencodeConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export type MessageError =
  | ProviderAuthError
  | UnknownError
  | MessageOutputLengthError
  | MessageAbortedError
  | StructuredOutputError
  | ContextOverflowError
  | ApiError;

export {
  type ApiError,
  type AssistantMessage,
  type ContextOverflowError,
  type Event,
  type FileDiff,
  type FilePart,
  type Message,
  type MessageAbortedError,
  type MessageOutputLengthError,
  type Part,
  type ProviderAuthError,
  type Session,
  type SessionStatus,
  type StepFinishPart,
  type StepStartPart,
  type StructuredOutputError,
  type SubtaskPart,
  type TextPart,
  type ToolPart,
  type ToolState,
  type ToolStateCompleted,
  type ToolStatePending,
  type UnknownError,
  type UserMessage,
  type ReasoningPart,
};

export interface OpencodeServerHealth {
  healthy: boolean;
  version: string;
}

export interface OpencodeSessionMessagesResult {
  info: Message;
  parts: Part[];
}

export interface OpencodeTimelineEntry {
  id: string;
  sessionID: string;
  messageID?: string;
  partID?: string;
  eventType: string;
  timestamp: number;
  data: unknown;
}
