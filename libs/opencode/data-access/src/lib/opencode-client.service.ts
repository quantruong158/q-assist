import { Injectable } from '@angular/core';
import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk/client';
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
  private abortController: AbortController | null = null;
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
    return result.data ?? [];
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const result = await this.getClient().session.get({ path: { id: sessionId } });
    return result.data ?? null;
  }

  async getSessionMessages(sessionId: string): Promise<OpencodeSessionMessagesResult[]> {
    const result = await this.getClient().session.messages({ path: { id: sessionId } });
    return result.data ?? [];
  }

  async getAllSessionStatus(): Promise<Record<string, SessionStatus>> {
    const result = await this.getClient().session.status();
    return result.data ?? {};
  }

  async abortSession(sessionId: string): Promise<boolean> {
    const result = await this.getClient().session.abort({ path: { id: sessionId } });
    return result.data ?? false;
  }

  subscribeToEvents(): EventSubscription {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    const result = this.getClient().event.subscribe({
      signal,
    }) as unknown as EventSubscriptionResult;
    return {
      stream: result.stream as AsyncIterable<Event>,
      cancel: () => this.abortController?.abort(),
    };
  }

  cancelEventSubscription(): void {
    this.abortController?.abort();
    this.abortController = null;
  }
}

export interface EventSubscription {
  stream: AsyncIterable<Event>;
  cancel: () => void;
}

type EventSubscriptionResult = {
  stream: AsyncGenerator<Event, void, unknown>;
};
