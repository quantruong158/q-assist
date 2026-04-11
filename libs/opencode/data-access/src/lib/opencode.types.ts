import type {
  ApiError,
  AssistantMessage,
  ContextOverflowError,
  Event,
  FilePart,
  Message,
  MessageAbortedError,
  MessageOutputLengthError,
  Model,
  Part,
  Provider,
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
  Path,
  FilePartInput,
  TextPartInput,
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

export interface OpencodeModel {
  id: string;
  label: string;
  provider: string;
  providerId: string;
  variants?: {
    [key: string]: {
      [key: string]: unknown;
    };
  };
}

export {
  type ApiError,
  type AssistantMessage,
  type ContextOverflowError,
  type Event,
  type FilePart,
  type Message,
  type MessageAbortedError,
  type MessageOutputLengthError,
  type Model,
  type Part,
  type Provider,
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
  type Path,
  type FilePartInput,
  type TextPartInput,
};

export interface OpencodeServerHealth {
  healthy: boolean;
  version: string;
}

export interface OpencodeCommand {
  name: string;
  description?: string;
  agent?: string;
  model?: string;
  source?: 'command' | 'mcp' | 'skill';
  template: string;
  hints: Array<string>;
}

export interface OpencodeAgent {
  name: string;
  description?: string;
  mode: 'subagent' | 'primary' | 'all';
  color?: string;
}

export interface OpencodeVariant {
  key: string;
  label: string;
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
