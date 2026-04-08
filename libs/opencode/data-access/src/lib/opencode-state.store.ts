import { computed, Injectable, signal } from '@angular/core';
import type {
  Message,
  OpencodeConnectionState,
  OpencodeTimelineEntry,
  Part,
  Path,
  Session,
  SessionStatus,
} from './opencode.types';

export interface OpencodeState {
  connectionState: OpencodeConnectionState;
  serverVersion: string | null;
  sessions: Record<string, Session>;
  activeSessionId: string | null;
  messagesById: Record<string, Message>;
  partsById: Record<string, Part>;
  sessionStatus: Record<string, SessionStatus>;
  timeline: OpencodeTimelineEntry[];
  error: string | null;
  isLoading: boolean;
  isStreaming: boolean;
  currentPath: Path | null;
}

const createInitialState = (): OpencodeState => ({
  connectionState: 'disconnected',
  serverVersion: null,
  sessions: {},
  activeSessionId: null,
  messagesById: {},
  partsById: {},
  sessionStatus: {},
  timeline: [],
  error: null,
  isLoading: false,
  isStreaming: false,
  currentPath: null,
});

@Injectable({ providedIn: 'root' })
export class OpencodeStateStore {
  private readonly _state = signal<OpencodeState>(createInitialState());

  readonly connectionState = computed(() => this._state().connectionState);
  readonly serverVersion = computed(() => this._state().serverVersion);
  readonly sessions = computed(() => this._state().sessions);
  readonly activeSessionId = computed(() => this._state().activeSessionId);
  readonly messagesById = computed(() => this._state().messagesById);
  readonly partsById = computed(() => this._state().partsById);
  readonly sessionStatus = computed(() => this._state().sessionStatus);
  readonly timeline = computed(() => this._state().timeline);
  readonly error = computed(() => this._state().error);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly isStreaming = computed(() => this._state().isStreaming);
  readonly currentPath = computed(() => this._state().currentPath);

  readonly sessionList = computed(() =>
    Object.values(this._state().sessions).sort((a, b) => b.time.updated - a.time.updated),
  );

  readonly activeSession = computed(() => {
    const id = this._state().activeSessionId;
    return id ? (this._state().sessions[id] ?? null) : null;
  });

  readonly activeSessionMessages = computed(() => {
    const sessionId = this._state().activeSessionId;
    if (!sessionId) return [];
    return Object.values(this._state().messagesById)
      .filter((m) => m.sessionID === sessionId)
      .sort((a, b) => a.time.created - b.time.created);
  });

  readonly activeSessionStatus = computed(() => {
    const id = this._state().activeSessionId;
    return id
      ? (this._state().sessionStatus[id] ?? { type: 'idle' as const })
      : { type: 'idle' as const };
  });

  setCurrentPath(path: Path | null): void {
    this._state.update((s) => ({ ...s, currentPath: path }));
  }

  setConnectionState(state: OpencodeConnectionState, version?: string): void {
    this._state.update((s) => ({
      ...s,
      connectionState: state,
      serverVersion: version ?? s.serverVersion,
      error: state === 'error' ? s.error : state === 'connected' ? null : s.error,
    }));
  }

  setError(error: string): void {
    this._state.update((s) => ({ ...s, error, connectionState: 'error' }));
  }

  setLoading(loading: boolean): void {
    this._state.update((s) => ({ ...s, isLoading: loading }));
  }

  setSessions(sessions: Session[]): void {
    const map = sessions.reduce<Record<string, Session>>((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});
    this._state.update((s) => {
      const existing = s.sessions;
      const updated = { ...existing, ...map };
      return { ...s, sessions: updated };
    });
  }

  upsertSession(session: Session): void {
    this._state.update((s) => ({
      ...s,
      sessions: { ...s.sessions, [session.id]: session },
    }));
  }

  removeSession(sessionId: string): void {
    this._state.update((s) => {
      const sessions = { ...s.sessions };
      delete sessions[sessionId];
      const messagesById = { ...s.messagesById };
      Object.keys(messagesById).forEach((k) => {
        if (messagesById[k].sessionID === sessionId) delete messagesById[k];
      });
      const partsById = { ...s.partsById };
      Object.keys(partsById).forEach((k) => {
        if (partsById[k].sessionID === sessionId) delete partsById[k];
      });
      return {
        ...s,
        sessions,
        messagesById,
        partsById,
        activeSessionId: s.activeSessionId === sessionId ? null : s.activeSessionId,
      };
    });
  }

  setActiveSession(sessionId: string | null): void {
    this._state.update((s) => {
      if (sessionId === s.activeSessionId) return { ...s, activeSessionId: sessionId };
      const messagesById = { ...s.messagesById };
      Object.keys(messagesById).forEach((k) => {
        if (messagesById[k].sessionID !== sessionId) delete messagesById[k];
      });
      const partsById = { ...s.partsById };
      Object.keys(partsById).forEach((k) => {
        if (partsById[k].sessionID !== sessionId) delete partsById[k];
      });
      return { ...s, activeSessionId: sessionId, messagesById, partsById };
    });
  }

  upsertMessage(message: Message): void {
    this._state.update((s) => ({
      ...s,
      messagesById: { ...s.messagesById, [message.id]: message },
    }));
  }

  removeMessage(sessionId: string, messageId: string): void {
    this._state.update((s) => {
      const messagesById = { ...s.messagesById };
      delete messagesById[messageId];
      const partsById = { ...s.partsById };
      Object.keys(partsById).forEach((k) => {
        if (partsById[k].sessionID === sessionId && partsById[k].messageID === messageId)
          delete partsById[k];
      });
      return { ...s, messagesById, partsById };
    });
  }

  upsertPart(part: Part): void {
    this._state.update((s) => ({
      ...s,
      partsById: { ...s.partsById, [part.id]: part },
    }));
  }

  removePart(sessionId: string, messageId: string, partId: string): void {
    this._state.update((s) => {
      const partsById = { ...s.partsById };
      delete partsById[partId];
      return { ...s, partsById };
    });
  }

  updateMessagePart(part: Part, delta?: string): void {
    this._state.update((s) => {
      const existing = s.partsById[part.id];
      if (!existing) {
        return { ...s, partsById: { ...s.partsById, [part.id]: part } };
      }
      if (part.type === 'text' && existing.type === 'text' && delta) {
        const updated: TextPart = { ...existing, text: existing.text + delta };
        return { ...s, partsById: { ...s.partsById, [part.id]: updated } };
      }
      return { ...s, partsById: { ...s.partsById, [part.id]: part } };
    });
  }

  applyMessagePartDelta(
    sessionID: string,
    messageID: string,
    partID: string,
    field: string,
    delta: string,
  ): void {
    this._state.update((s) => {
      const existing = s.partsById[partID];
      if (!existing) return { ...s };

      let updated: Part;
      if (field === 'text' && existing.type === 'text') {
        updated = { ...existing, text: existing.text + delta } as Part;
      } else if (field === 'text' && existing.type === 'reasoning') {
        updated = { ...existing, text: existing.text + delta } as Part;
      } else {
        return { ...s };
      }

      return { ...s, partsById: { ...s.partsById, [partID]: updated } };
    });
  }

  setSessionStatus(sessionId: string, status: SessionStatus): void {
    this._state.update((s) => ({
      ...s,
      sessionStatus: { ...s.sessionStatus, [sessionId]: status },
      isStreaming: status.type === 'busy',
    }));
  }

  addTimelineEntry(entry: Omit<OpencodeTimelineEntry, 'id' | 'timestamp'>): void {
    const newEntry: OpencodeTimelineEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    this._state.update((s) => ({
      ...s,
      timeline: [...s.timeline, newEntry],
    }));
  }

  reset(): void {
    this._state.set(createInitialState());
  }
}

interface TextPart {
  id: string;
  sessionID: string;
  messageID: string;
  type: 'text';
  text: string;
}
