import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Conversation, CreateConversationData } from '../models';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly firestore = inject(Firestore);
  private readonly platformId = inject(PLATFORM_ID);

  getConversations(userId: string): Observable<Conversation[]> {
    return new Observable((subscriber) => {
      if (!isPlatformBrowser(this.platformId)) {
        subscriber.next([]);
        subscriber.complete();
        return;
      }

      const conversationsRef = collection(this.firestore, `users/${userId}/conversations`);
      const q = query(conversationsRef, orderBy('updatedAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const conversations = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Conversation[];
          subscriber.next(conversations);
        },
        (error) => {
          subscriber.error(error);
        },
      );

      return () => unsubscribe();
    });
  }

  async createConversation(userId: string, data: CreateConversationData): Promise<string> {
    const conversationsRef = collection(this.firestore, `users/${userId}/conversations`);

    const docRef = await addDoc(conversationsRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  }

  async updateConversation(
    userId: string,
    conversationId: string,
    data: Partial<Pick<Conversation, 'title' | 'lastMessage'>>,
  ): Promise<void> {
    const conversationRef = doc(this.firestore, `users/${userId}/conversations/${conversationId}`);

    await updateDoc(conversationRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteConversation(userId: string, conversationId: string): Promise<void> {
    const conversationRef = doc(this.firestore, `users/${userId}/conversations/${conversationId}`);

    await deleteDoc(conversationRef);
  }

  generateTitle(firstMessage: string): string {
    const maxLength = 50;
    const trimmed = firstMessage.trim();

    if (trimmed.length <= maxLength) {
      return trimmed;
    }

    return trimmed.substring(0, maxLength).trim() + '...';
  }
}
