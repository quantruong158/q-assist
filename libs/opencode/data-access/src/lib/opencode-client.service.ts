import { Injectable } from '@angular/core';
import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk/v2/client';
import { Observable } from 'rxjs';
import type {
  Event,
  OpencodeServerHealth,
  OpencodeSessionMessagesResult,
  Session,
  SessionStatus,
} from './opencode.types';

const DEFAULT_BASE_URL = 'http://localhost:4096';

@Injectable({ providedIn: 'root' })
export class OpencodeClientService {
  private client: OpencodeClient | null = null;
  private baseUrl: string;

  constructor() {
    this.baseUrl = DEFAULT_BASE_URL;
  }

  private getClient(): OpencodeClient {
    if (!this.client) {
      this.client = createOpencodeClient({ baseUrl: this.baseUrl });
    }
    return this.client;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async checkHealth(): Promise<OpencodeServerHealth> {
    try {
      const response = await fetch(`${this.baseUrl}/global/health`);
      if (!response.ok) {
        return { healthy: false, version: '' };
      }
      const data = await response.json();
      return { healthy: data.healthy ?? true, version: data.version ?? '' };
    } catch {
      return { healthy: false, version: '' };
    }
  }

  async listSessions(): Promise<Session[]> {
    const result = await this.getClient().session.list();
    return (result.data ?? []).filter((s) => !s.time.archived && !s.parentID);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const result = await this.getClient().session.get({ sessionID: sessionId });
    return result.data ?? null;
  }

  async getSessionMessages(sessionId: string): Promise<OpencodeSessionMessagesResult[]> {
    const result = await this.getClient().session.messages({ sessionID: sessionId });
    return result.data ?? [];
  }

  async getAllSessionStatus(): Promise<Record<string, SessionStatus>> {
    const result = await this.getClient().session.status();
    return result.data ?? {};
  }

  async abortSession(sessionId: string): Promise<boolean> {
    const result = await this.getClient().session.abort({ sessionID: sessionId });
    return result.data ?? false;
  }

  subscribeToEvents(): Observable<Event> {
    return new Observable<Event>((subscriber) => {
      const eventSource = new EventSource(`${this.baseUrl}/event`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Event;
          subscriber.next(data);
        } catch (err) {
          console.error('[OpencodeClientService] Failed to parse SSE payload', err);
        }
      };

      eventSource.onerror = (err) => {
        subscriber.error(err);
      };

      return () => {
        eventSource.close();
      };
    });
  }
}
