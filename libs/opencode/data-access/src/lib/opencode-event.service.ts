import { inject, Injectable, OnDestroy } from '@angular/core';
import { OpencodeClientService } from './opencode-client.service';
import { OpencodeStateStore } from './opencode-state.store';
import type { Event, Message, Part, Session, SessionStatus } from './opencode.types';
import { Subscription, timer } from 'rxjs';
import { retry } from 'rxjs/operators';

const SSE_RECONNECT_DELAY_MS = 3000;
const SSE_MAX_RETRIES = 5;

@Injectable({ providedIn: 'root' })
export class OpencodeEventService implements OnDestroy {
  private readonly clientService = inject(OpencodeClientService);
  private readonly store = inject(OpencodeStateStore);
  private eventSubscription: Subscription | null = null;
  private isSubscribed = false;
  private hasReceivedServerConnected = false;
  private retryCount = 0;

  subscribe(): void {
    if (this.isSubscribed) return;
    this.isSubscribed = true;
    this.retryCount = 0;
    this.startSubscription();
  }

  private startSubscription(): void {
    this.eventSubscription = this.clientService
      .subscribeToEvents()
      .pipe(
        retry({
          count: SSE_MAX_RETRIES,
          delay: (error, retryCount) => {
            if (retryCount >= SSE_MAX_RETRIES || this.hasReceivedServerConnected) {
              this.handleMaxRetriesReached();
              throw error;
            }
            this.retryCount = retryCount;
            const delay = Math.min(SSE_RECONNECT_DELAY_MS * retryCount, 30000);
            return timer(delay);
          },
        }),
      )
      .subscribe({
        next: (event) => this.handleEvent(event),
        error: (err) => this.handleStreamError(err),
      });
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

      case 'message.part.delta': {
        const { sessionID, messageID, partID, field, delta } = event.properties as {
          sessionID: string;
          messageID: string;
          partID: string;
          field: string;
          delta: string;
        };
        this.store.applyMessagePartDelta(sessionID, messageID, partID, field, delta);
        this.store.addTimelineEntry({
          sessionID,
          messageID,
          partID,
          eventType: event.type,
          data: { field, delta },
        });
        break;
      }

      default:
        break;
    }
  }

  private handleMaxRetriesReached(): void {
    if (!this.isSubscribed) return;
    this.store.setConnectionState('error');
    this.store.setError(
      'Lost connection to OpenCode server. Please check that the server is running.',
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleStreamError(_err: unknown): void {
    if (!this.isSubscribed) return;

    if (!this.hasReceivedServerConnected) {
      this.handleMaxRetriesReached();
    }
  }

  cancel(): void {
    this.isSubscribed = false;
    this.hasReceivedServerConnected = false;
    this.eventSubscription?.unsubscribe();
    this.eventSubscription = null;
    this.store.setConnectionState('disconnected');
  }

  ngOnDestroy(): void {
    this.cancel();
  }
}
