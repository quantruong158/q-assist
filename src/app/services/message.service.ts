import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Firestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Message, CreateMessageData } from '../models';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly firestore = inject(Firestore);
  private readonly platformId = inject(PLATFORM_ID);

  getMessages(userId: string, conversationId: string): Observable<Message[]> {
    return new Observable((subscriber) => {
      if (!isPlatformBrowser(this.platformId)) {
        subscriber.next([]);
        subscriber.complete();
        return;
      }

      const messagesRef = collection(
        this.firestore,
        `users/${userId}/conversations/${conversationId}/messages`,
      );
      const q = query(messagesRef, orderBy('order', 'asc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const messages = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Message[];
          subscriber.next(messages);
        },
        (error) => {
          subscriber.error(error);
        },
      );

      return () => unsubscribe();
    });
  }

  async getRecentMessages(
    userId: string,
    conversationId: string,
    messageLimit = 20,
  ): Promise<Message[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }

    const messagesRef = collection(
      this.firestore,
      `users/${userId}/conversations/${conversationId}/messages`,
    );

    // Get messages ordered by order descending, limited
    const q = query(messagesRef, orderBy('order', 'desc'), limit(messageLimit));
    const snapshot = await getDocs(q);

    // Map and reverse to get chronological order
    const messages = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .reverse() as Message[];

    return messages;
  }

  async addMessage(
    userId: string,
    conversationId: string,
    data: CreateMessageData,
  ): Promise<string> {
    const messagesRef = collection(
      this.firestore,
      `users/${userId}/conversations/${conversationId}/messages`,
    );

    const docRef = await addDoc(messagesRef, {
      ...data,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  }

  async getNextOrder(userId: string, conversationId: string): Promise<number> {
    if (!isPlatformBrowser(this.platformId)) {
      return 0;
    }

    const messagesRef = collection(
      this.firestore,
      `users/${userId}/conversations/${conversationId}/messages`,
    );

    const q = query(messagesRef, orderBy('order', 'desc'), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return 0;
    }

    const lastMessage = snapshot.docs[0].data() as Message;
    return lastMessage.order + 1;
  }
}
