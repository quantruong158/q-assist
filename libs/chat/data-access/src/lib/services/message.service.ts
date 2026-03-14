import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import {
  addDoc,
  collection,
  Firestore,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from '@angular/fire/firestore';
import { CreateMessageData, Message } from '@qos/chat/shared-models';
import { Observable } from 'rxjs';

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
          const messages = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
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

    const q = query(messagesRef, orderBy('order', 'desc'), limit(messageLimit));
    const snapshot = await getDocs(q);

    return snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .reverse() as Message[];
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
