import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { OpencodeStateStore } from './opencode-state.store';

describe('OpencodeStateStore', () => {
  let store: OpencodeStateStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({}).compileComponents();
    store = TestBed.inject(OpencodeStateStore);
  });

  afterEach(() => {
    store.reset();
  });

  describe('connection state', () => {
    it('should start disconnected', () => {
      expect(store.connectionState()).toBe('disconnected');
    });

    it('should set connection state to connected', () => {
      store.setConnectionState('connected', '1.0.0');
      expect(store.connectionState()).toBe('connected');
      expect(store.serverVersion()).toBe('1.0.0');
    });

    it('should set connection state to error and preserve error message', () => {
      store.setConnectionState('error', undefined);
      store.setError('Server unreachable');
      expect(store.connectionState()).toBe('error');
      expect(store.error()).toBe('Server unreachable');
    });

    it('should clear error on successful connection', () => {
      store.setError('Previous error');
      store.setConnectionState('connected');
      expect(store.error()).toBeNull();
    });
  });

  describe('sessions', () => {
    const mockSession = {
      id: 'session-1',
      projectID: 'proj-1',
      directory: '/test',
      title: 'Test Session',
      version: '1.0.0',
      time: { created: 1000, updated: 2000 },
    };

    it('should upsert a session', () => {
      store.upsertSession(mockSession);
      expect(store.sessions()[mockSession.id]).toEqual(mockSession);
    });

    it('should update an existing session', () => {
      store.upsertSession(mockSession);
      const updated = { ...mockSession, title: 'Updated Title' };
      store.upsertSession(updated);
      expect(store.sessions()[mockSession.id].title).toBe('Updated Title');
    });

    it('should remove a session', () => {
      store.upsertSession(mockSession);
      store.removeSession(mockSession.id);
      expect(store.sessions()[mockSession.id]).toBeUndefined();
    });

    it('should set active session', () => {
      store.upsertSession(mockSession);
      store.setActiveSession(mockSession.id);
      expect(store.activeSessionId()).toBe(mockSession.id);
      expect(store.activeSession()).toEqual(mockSession);
    });

    it('should clear active session when removed', () => {
      store.upsertSession(mockSession);
      store.setActiveSession(mockSession.id);
      store.removeSession(mockSession.id);
      expect(store.activeSessionId()).toBeNull();
    });

    it('should sort sessions by updated time descending', () => {
      const older = { ...mockSession, id: 'older', time: { ...mockSession.time, updated: 1000 } };
      const newer = { ...mockSession, id: 'newer', time: { ...mockSession.time, updated: 2000 } };
      store.upsertSession(older);
      store.upsertSession(newer);
      const list = store.sessionList();
      expect(list[0].id).toBe('newer');
      expect(list[1].id).toBe('older');
    });
  });

  describe('setActiveSession', () => {
    const mockSession = {
      id: 'session-1',
      projectID: 'proj-1',
      directory: '/test',
      title: 'Test Session',
      version: '1.0.0',
      time: { created: 1000, updated: 2000 },
    };

    it('should clear messages and parts when switching sessions', () => {
      const msg = {
        id: 'msg-1',
        sessionID: 'session-1',
        role: 'user' as const,
        time: { created: 1000 },
        agent: 'test',
        model: { providerID: 'p', modelID: 'm' },
      };
      const part = {
        id: 'part-1',
        sessionID: 'session-1',
        messageID: 'msg-1',
        type: 'text' as const,
        text: 'hello',
      };
      store.upsertSession(mockSession);
      store.upsertMessage(msg);
      store.upsertPart(part);
      expect(store.partsById()['part-1']).toBeTruthy();
      expect(store.messagesById()['msg-1']).toBeTruthy();

      store.setActiveSession('session-2');
      expect(store.partsById()['part-1']).toBeUndefined();
      expect(store.messagesById()['msg-1']).toBeUndefined();
    });

    it('should preserve messages and parts when setting the same session', () => {
      const msg = {
        id: 'msg-1',
        sessionID: 'session-1',
        role: 'user' as const,
        time: { created: 1000 },
        agent: 'test',
        model: { providerID: 'p', modelID: 'm' },
      };
      const part = {
        id: 'part-1',
        sessionID: 'session-1',
        messageID: 'msg-1',
        type: 'text' as const,
        text: 'hello',
      };
      store.upsertSession(mockSession);
      store.upsertMessage(msg);
      store.upsertPart(part);
      store.setActiveSession('session-1');
      expect(store.partsById()['part-1']).toBeTruthy();
      expect(store.messagesById()['msg-1']).toBeTruthy();
    });
  });

  describe('messages', () => {
    const mockUserMessage = {
      id: 'msg-1',
      sessionID: 'session-1',
      role: 'user' as const,
      time: { created: 1000 },
      agent: 'test-agent',
      model: { providerID: 'openai', modelID: 'gpt-4' },
    };

    const mockAssistantMessage = {
      id: 'msg-2',
      sessionID: 'session-1',
      role: 'assistant' as const,
      time: { created: 2000 },
      parentID: 'msg-1',
      modelID: 'gpt-4',
      providerID: 'openai',
      mode: 'agent',
      path: { cwd: '/test', root: '/test' },
      cost: 0,
      tokens: { input: 100, output: 200, reasoning: 50, cache: { read: 0, write: 0 } },
    };

    beforeEach(() => {
      store.setActiveSession('session-1');
    });

    it('should upsert a message', () => {
      store.upsertMessage(mockUserMessage);
      expect(store.messagesById()[mockUserMessage.id]).toEqual(mockUserMessage);
    });

    it('should update an existing message', () => {
      store.upsertMessage(mockUserMessage);
      store.upsertMessage(mockAssistantMessage);
      expect(store.messagesById()[mockAssistantMessage.id].role).toBe('assistant');
    });

    it('should return only messages for active session', () => {
      const otherMessage = { ...mockUserMessage, id: 'msg-3', sessionID: 'other-session' };
      store.upsertMessage(mockUserMessage);
      store.upsertMessage(otherMessage);
      const activeMessages = store.activeSessionMessages();
      expect(activeMessages.length).toBe(1);
      expect(activeMessages[0].id).toBe('msg-1');
    });

    it('should remove message', () => {
      store.upsertMessage(mockUserMessage);
      store.removeMessage(mockUserMessage.sessionID, mockUserMessage.id);
      expect(store.messagesById()[mockUserMessage.id]).toBeUndefined();
    });
  });

  describe('parts', () => {
    const mockPart = {
      id: 'part-1',
      sessionID: 'session-1',
      messageID: 'msg-1',
      type: 'text' as const,
      text: 'Hello',
    };

    it('should upsert a part', () => {
      store.upsertPart(mockPart);
      expect(store.partsById()[mockPart.id]).toEqual(mockPart);
    });

    it('should update a text part with delta', () => {
      store.upsertPart(mockPart);
      const deltaPart = { ...mockPart, text: 'Hello World' };
      store.updateMessagePart(deltaPart, ' World');
      expect(store.partsById()[mockPart.id].type).toBe('text');
      expect((store.partsById()[mockPart.id] as { text: string }).text).toBe('Hello World');
    });

    it('should remove part', () => {
      store.upsertPart(mockPart);
      store.removePart(mockPart.sessionID, mockPart.messageID, mockPart.id);
      expect(store.partsById()[mockPart.id]).toBeUndefined();
    });

    it('should accumulate text from delta updates', () => {
      const part1 = { ...mockPart, id: 'p1', text: 'Hello' };
      store.upsertPart(part1);
      store.updateMessagePart({ ...part1, text: 'Hello there' }, ' there');
      expect((store.partsById()['p1'] as { text: string }).text).toBe('Hello there');
    });

    it('should store parts for multiple messages in the same session', () => {
      const msg1Part = { ...mockPart, id: 'part-msg1', messageID: 'msg-1' };
      const msg2Part = { ...mockPart, id: 'part-msg2', messageID: 'msg-2' };
      store.upsertPart(msg1Part);
      store.upsertPart(msg2Part);
      expect(Object.keys(store.partsById()).length).toBe(2);
      expect(store.partsById()['part-msg1'].messageID).toBe('msg-1');
      expect(store.partsById()['part-msg2'].messageID).toBe('msg-2');
    });
  });

  describe('session status', () => {
    it('should set session status to busy', () => {
      store.setSessionStatus('session-1', { type: 'busy' });
      expect(store.sessionStatus()['session-1'].type).toBe('busy');
      expect(store.isStreaming()).toBe(true);
    });

    it('should set session status to idle', () => {
      store.setSessionStatus('session-1', { type: 'idle' });
      expect(store.sessionStatus()['session-1'].type).toBe('idle');
      expect(store.isStreaming()).toBe(false);
    });

    it('should set session status to retry', () => {
      store.setSessionStatus('session-1', {
        type: 'retry',
        attempt: 1,
        message: 'Error',
        next: 1000,
      });
      expect(store.sessionStatus()['session-1'].type).toBe('retry');
    });
  });

  describe('timeline', () => {
    it('should add timeline entries', () => {
      store.addTimelineEntry({ sessionID: 's1', eventType: 'session.created', data: null });
      store.addTimelineEntry({ sessionID: 's1', eventType: 'message.updated', data: null });
      expect(store.timeline().length).toBe(2);
    });

    it('should assign unique ids to timeline entries', () => {
      store.addTimelineEntry({ sessionID: 's1', eventType: 'a', data: null });
      store.addTimelineEntry({ sessionID: 's1', eventType: 'b', data: null });
      const ids = store.timeline().map((e) => e.id);
      expect(new Set(ids).size).toBe(2);
    });

    it('should assign timestamps to timeline entries', () => {
      store.addTimelineEntry({ sessionID: 's1', eventType: 'session.created', data: null });
      expect(store.timeline()[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe('loading state', () => {
    it('should set loading state', () => {
      store.setLoading(true);
      expect(store.isLoading()).toBe(true);
      store.setLoading(false);
      expect(store.isLoading()).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      store.setConnectionState('connected', '1.0.0');
      store.setLoading(true);
      store.addTimelineEntry({ sessionID: 's1', eventType: 'test', data: null });
      store.reset();
      expect(store.connectionState()).toBe('disconnected');
      expect(store.serverVersion()).toBeNull();
      expect(store.isLoading()).toBe(false);
      expect(store.timeline().length).toBe(0);
      expect(store.sessionList().length).toBe(0);
    });
  });
});
