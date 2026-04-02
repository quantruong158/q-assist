import { inject, Injectable, OnDestroy } from '@angular/core';
import { OpencodeClientService } from './opencode-client.service';
import { OpencodeStateStore } from './opencode-state.store';
import type { Event, Message, Part, Session, SessionStatus } from './opencode.types';

const SSE_RECONNECT_DELAY_MS = 3000;
const SSE_MAX_RETRIES = 5;

@Injectable({ providedIn: 'root' })
export class OpencodeEventService implements OnDestroy {
  private readonly clientService = inject(OpencodeClientService);
  private readonly store = inject(OpencodeStateStore);
  private subscription: { stream: AsyncIterable<Event>; cancel: () => void } | null = null;
  private isSubscribed = false;
  private hasReceivedServerConnected = false;
  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  async subscribe(): Promise<void> {
    if (this.isSubscribed) return;
    this.isSubscribed = true;
    this.retryCount = 0;
    await this.startSubscription();
  }

  private async startSubscription(): Promise<void> {
    try {
      this.subscription = this.clientService.subscribeToEvents();

      for await (const event of this.subscription.stream) {
        this.handleEvent(event);
      }
    } catch {
      if (!this.isSubscribed) return;
      this.handleStreamError();
    }
  }

  private handleEvent(event: Event): void {
    if (event.type === 'server.connected') {
      this.hasReceivedServerConnected = true;
      this.store.setConnectionState('connected', this.store.serverVersion() ?? undefined);
      this.store.addTimelineEntry({
        sessionID: '',
        eventType: event.type,
        data: event.properties,
      });
      return;
    }

    if (!this.hasReceivedServerConnected) {
      this.store.setConnectionState('connecting');
    }

    switch (event.type) {
      case 'session.created': {
        const session = event.properties.info as Session;
        this.store.upsertSession(session);
        this.store.addTimelineEntry({
          sessionID: session.id,
          eventType: event.type,
          data: session,
        });
        break;
      }

      case 'session.updated': {
        const session = event.properties.info as Session;
        this.store.upsertSession(session);
        this.store.addTimelineEntry({
          sessionID: session.id,
          eventType: event.type,
          data: session,
        });
        break;
      }

      case 'session.deleted': {
        const session = event.properties.info as Session;
        this.store.removeSession(session.id);
        this.store.addTimelineEntry({
          sessionID: session.id,
          eventType: event.type,
          data: session,
        });
        break;
      }

      case 'session.status': {
        const { sessionID, status } = event.properties as {
          sessionID: string;
          status: SessionStatus;
        };
        this.store.setSessionStatus(sessionID, status);
        this.store.addTimelineEntry({ sessionID, eventType: event.type, data: status });
        break;
      }

      case 'session.idle': {
        const sessionID = event.properties.sessionID as string;
        this.store.setSessionStatus(sessionID, { type: 'idle' });
        this.store.addTimelineEntry({ sessionID, eventType: event.type, data: null });
        break;
      }

      case 'session.error': {
        const { sessionID, error } = event.properties as { sessionID?: string; error?: unknown };
        if (sessionID) {
          this.store.setSessionStatus(sessionID, { type: 'idle' });
          this.store.addTimelineEntry({ sessionID, eventType: event.type, data: error });
        }
        break;
      }

      case 'message.updated': {
        const message = event.properties.info as Message;
        this.store.upsertMessage(message);
        this.store.addTimelineEntry({
          sessionID: message.sessionID,
          messageID: message.id,
          eventType: event.type,
          data: message,
        });
        break;
      }

      case 'message.removed': {
        const { sessionID, messageID } = event.properties as {
          sessionID: string;
          messageID: string;
        };
        this.store.removeMessage(sessionID, messageID);
        this.store.addTimelineEntry({ sessionID, messageID, eventType: event.type, data: null });
        break;
      }

      case 'message.part.updated': {
        const { part, delta } = event.properties as { part: Part; delta?: string };
        this.store.updateMessagePart(part, delta);
        this.store.addTimelineEntry({
          sessionID: part.sessionID,
          messageID: part.messageID,
          partID: part.id,
          eventType: event.type,
          data: { part, delta },
        });
        break;
      }

      case 'message.part.removed': {
        const { sessionID, messageID, partID } = event.properties as {
          sessionID: string;
          messageID: string;
          partID: string;
        };
        this.store.removePart(sessionID, messageID, partID);
        this.store.addTimelineEntry({
          sessionID,
          messageID,
          partID,
          eventType: event.type,
          data: null,
        });
        break;
      }

      default:
        break;
    }
  }

  private handleStreamError(): void {
    this.subscription?.cancel();
    this.subscription = null;

    if (!this.isSubscribed) return;

    if (!this.hasReceivedServerConnected && this.retryCount < SSE_MAX_RETRIES) {
      this.retryCount++;
      const delay = Math.min(SSE_RECONNECT_DELAY_MS * this.retryCount, 30000);
      this.retryTimeout = setTimeout(() => {
        void this.startSubscription();
      }, delay);
    } else {
      this.store.setConnectionState('error');
      this.store.setError(
        'Lost connection to OpenCode server. Please check that the server is running.',
      );
    }
  }

  cancel(): void {
    this.isSubscribed = false;
    this.hasReceivedServerConnected = false;
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.subscription?.cancel();
    this.subscription = null;
    this.store.setConnectionState('disconnected');
  }

  ngOnDestroy(): void {
    this.cancel();
  }
}
