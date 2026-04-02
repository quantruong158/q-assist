export type OpencodeConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface FileDiff {
  file: string;
  before: string;
  after: string;
  additions: number;
  deletions: number;
}

export interface Session {
  id: string;
  projectID: string;
  directory: string;
  parentID?: string;
  summary?: {
    additions: number;
    deletions: number;
    files: number;
    diffs?: FileDiff[];
  };
  share?: { url: string };
  title: string;
  version: string;
  time: {
    created: number;
    updated: number;
    compacting?: number;
  };
  revert?: {
    messageID: string;
    partID?: string;
    snapshot?: string;
    diff?: string;
  };
}

export interface MessageBase {
  id: string;
  sessionID: string;
  time: {
    created: number;
    completed?: number;
  };
}

export interface UserMessage extends MessageBase {
  role: 'user';
  summary?: {
    title?: string;
    body?: string;
    diffs: FileDiff[];
  };
  agent: string;
  model: { providerID: string; modelID: string };
  system?: string;
  tools?: Record<string, boolean>;
}

export interface ProviderAuthError {
  name: 'ProviderAuthError';
  data: { providerID: string; message: string };
}

export interface UnknownError {
  name: 'UnknownError';
  data: { message: string };
}

export interface MessageOutputLengthError {
  name: 'MessageOutputLengthError';
  data: Record<string, unknown>;
}

export interface MessageAbortedError {
  name: 'MessageAbortedError';
  data: { message: string };
}

export interface ApiError {
  name: 'APIError';
  data: {
    message: string;
    statusCode?: number;
    isRetryable: boolean;
    responseHeaders?: Record<string, string>;
    responseBody?: string;
  };
}

export type MessageError =
  | ProviderAuthError
  | UnknownError
  | MessageOutputLengthError
  | MessageAbortedError
  | ApiError;

export interface AssistantMessage extends MessageBase {
  role: 'assistant';
  error?: MessageError;
  parentID: string;
  modelID: string;
  providerID: string;
  mode: string;
  path: { cwd: string; root: string };
  summary?: boolean;
  cost: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: { read: number; write: number };
  };
  finish?: string;
}

export type Message = UserMessage | AssistantMessage;

export interface TextPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'text';
  text: string;
  synthetic?: boolean;
  ignored?: boolean;
  time?: { start: number; end?: number };
  metadata?: Record<string, unknown>;
}

export interface ReasoningPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'reasoning';
  text: string;
  metadata?: Record<string, unknown>;
  time: { start: number; end?: number };
}

export interface ToolStatePending {
  status: 'pending';
  input: Record<string, unknown>;
  raw: string;
}

export interface ToolStateRunning {
  status: 'running';
  input: Record<string, unknown>;
  title?: string;
  metadata?: Record<string, unknown>;
  time: { start: number };
}

export interface ToolStateCompleted {
  status: 'completed';
  input: Record<string, unknown>;
  output: string;
  title: string;
  metadata: Record<string, unknown>;
  time: { start: number; end: number; compacted?: number };
  attachments?: unknown[];
}

export interface ToolStateError {
  status: 'error';
  input: Record<string, unknown>;
  error: string;
  metadata?: Record<string, unknown>;
  time: { start: number; end: number };
}

export type ToolState = ToolStatePending | ToolStateRunning | ToolStateCompleted | ToolStateError;

export interface ToolPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'tool';
  callID: string;
  tool: string;
  state: ToolState;
  metadata?: Record<string, unknown>;
}

export interface StepStartPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'step-start';
  snapshot?: string;
}

export interface StepFinishPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'step-finish';
  reason: string;
  snapshot?: string;
  cost: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: { read: number; write: number };
  };
}

export interface SnapshotPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'snapshot';
  snapshot: string;
}

export interface PatchPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'patch';
  hash: string;
  files: string[];
}

export interface AgentPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'agent';
  name: string;
  source?: { value: string; start: number; end: number };
}

export interface RetryPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'retry';
  attempt: number;
  error: ApiError;
  time: { created: number };
}

export interface CompactionPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'compaction';
  auto: boolean;
}

export interface SubtaskPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'subtask';
  prompt: string;
  description: string;
  agent: string;
}

export interface FilePart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'file';
  mime: string;
  filename?: string;
  url: string;
  source?: unknown;
}

export type Part =
  | TextPart
  | ReasoningPart
  | ToolPart
  | StepStartPart
  | StepFinishPart
  | SnapshotPart
  | PatchPart
  | AgentPart
  | RetryPart
  | CompactionPart
  | SubtaskPart
  | FilePart;

export type SessionStatus =
  | { type: 'idle' }
  | { type: 'busy' }
  | { type: 'retry'; attempt: number; message: string; next: number };

export type Event =
  | { type: 'server.connected'; properties: Record<string, unknown> }
  | { type: 'server.instance.disposed'; properties: { directory: string } }
  | { type: 'session.created'; properties: { info: Session } }
  | { type: 'session.updated'; properties: { info: Session } }
  | { type: 'session.deleted'; properties: { info: Session } }
  | { type: 'session.status'; properties: { sessionID: string; status: SessionStatus } }
  | { type: 'session.idle'; properties: { sessionID: string } }
  | { type: 'session.compacted'; properties: { sessionID: string } }
  | { type: 'session.diff'; properties: { sessionID: string; diff: FileDiff[] } }
  | { type: 'session.error'; properties: { sessionID?: string; error?: MessageError } }
  | { type: 'message.updated'; properties: { info: Message } }
  | { type: 'message.removed'; properties: { sessionID: string; messageID: string } }
  | { type: 'message.part.updated'; properties: { part: Part; delta?: string } }
  | {
      type: 'message.part.removed';
      properties: { sessionID: string; messageID: string; partID: string };
    }
  | { type: 'permission.updated'; properties: unknown }
  | {
      type: 'permission.replied';
      properties: { sessionID: string; permissionID: string; response: string };
    }
  | { type: 'file.edited'; properties: { file: string } }
  | { type: 'todo.updated'; properties: { sessionID: string; todos: unknown[] } }
  | {
      type: 'command.executed';
      properties: { name: string; sessionID: string; arguments: string; messageID: string };
    }
  | { type: 'lsp.client.diagnostics'; properties: { serverID: string; path: string } }
  | { type: 'lsp.updated'; properties: Record<string, unknown> }
  | { type: 'installation.updated'; properties: { version: string } }
  | { type: 'installation.update-available'; properties: { version: string } }
  | {
      type: 'file.watcher.updated';
      properties: { file: string; event: 'add' | 'change' | 'unlink' };
    }
  | { type: 'vcs.branch.updated'; properties: { branch?: string } }
  | { type: 'tui.prompt.append'; properties: { text: string } }
  | { type: 'tui.command.execute'; properties: { command: string } }
  | {
      type: 'tui.toast.show';
      properties: {
        title?: string;
        message: string;
        variant: 'info' | 'success' | 'warning' | 'error';
        duration?: number;
      };
    }
  | {
      type: 'pty.created';
      properties: {
        info: {
          id: string;
          title: string;
          command: string;
          args: string[];
          cwd: string;
          status: 'running' | 'exited';
          pid: number;
        };
      };
    }
  | { type: 'pty.updated'; properties: { info: unknown } }
  | { type: 'pty.exited'; properties: { id: string; exitCode: number } }
  | { type: 'pty.deleted'; properties: { id: string } };

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
