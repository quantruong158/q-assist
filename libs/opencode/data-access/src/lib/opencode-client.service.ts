import { Injectable } from '@angular/core';
import { createOpencodeClient, OpencodeClient } from '@opencode-ai/sdk/v2/client';
import { Observable } from 'rxjs';
import type {
  Event,
  FilePartInput,
  OpencodeAgent,
  OpencodeCommand,
  OpencodeModel,
  OpencodeServerHealth,
  OpencodeSessionMessagesResult,
  Path,
  Session,
  SessionStatus,
  TextPartInput,
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

  async getCurrentPath(): Promise<Path | null> {
    const result = await this.getClient().path.get();
    return result.data ?? null;
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

  async promptSession(
    sessionId: string,
    text: string,
    model?: { providerID: string; modelID: string },
    options?: {
      agent?: string;
      variant?: string;
      parts?: Array<{ type: 'file'; mime: string; filename?: string; url: string }>;
    },
  ): Promise<void> {
    const parts: Array<TextPartInput | FilePartInput> = [{ type: 'text', text }];
    if (options?.parts) {
      parts.push(...options.parts);
    }

    await this.getClient().session.prompt({
      sessionID: sessionId,
      parts,
      model,
      agent: options?.agent,
      variant: options?.variant,
    });
  }

  async listCommands(): Promise<OpencodeCommand[]> {
    const result = await this.getClient().command.list();
    return result.data ?? [];
  }

  async listAgents(): Promise<OpencodeAgent[]> {
    const result = await this.getClient().app.agents();
    return (result.data ?? []).filter((a) => a.mode === 'primary' && !a.hidden);
  }

  async searchFiles(
    query: string,
  ): Promise<Array<{ name: string; type: 'file' | 'directory'; url: string }>> {
    const [filesResult, dirsResult] = await Promise.all([
      this.getClient().find.files({ query, type: 'file' }),
      this.getClient().find.files({ query, type: 'directory' }),
    ]);

    const items: Array<{ name: string; type: 'file' | 'directory'; url: string }> = [];

    for (const path of filesResult.data ?? []) {
      items.push({
        name: path,
        type: 'file',
        url: path,
      });
    }

    for (const path of dirsResult.data ?? []) {
      items.push({
        name: path,
        type: 'directory',
        url: path,
      });
    }

    return items;
  }

  async executeCommand(
    sessionId: string,
    command: string,
    options?: {
      arguments?: string;
      agent?: string;
      model?: string;
      variant?: string;
      parts?: Array<{ type: 'file'; mime: string; filename?: string; url: string }>;
    },
  ): Promise<void> {
    await this.getClient().session.command({
      sessionID: sessionId,
      command,
      arguments: options?.arguments ?? '',
      agent: options?.agent,
      model: options?.model,
      variant: options?.variant,
      parts: options?.parts,
    });
  }

  async getProviders(): Promise<Partial<Record<string, OpencodeModel[]>>> {
    const result = await this.getClient().config.providers();
    const data = result.data;
    if (!data) return {};

    const { providers } = data;
    const grouped: Partial<Record<string, OpencodeModel[]>> = {};
    for (const provider of providers) {
      const models = Object.values(provider.models);
      if (models.length === 0) continue;

      const opencodeModels: OpencodeModel[] = models.map((m) => ({
        id: m.id,
        label: m.name,
        provider: provider.name,
        providerId: provider.id,
        variants: m.variants,
      }));

      grouped[provider.name] = opencodeModels;
    }
    return grouped;
  }

  async createSession(): Promise<Session | null> {
    const result = await this.getClient().session.create();
    return result.data ?? null;
  }

  async deleteSession(sessionId: string): Promise<boolean | null> {
    const result = await this.getClient().session.delete({ sessionID: sessionId });
    return result.data ?? null;
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
