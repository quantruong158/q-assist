import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  doc,
} from '@angular/fire/firestore';
import { MoneySource, MoneySourceType } from '../models/money-source.model';

@Injectable({ providedIn: 'root' })
export class MoneySourceService {
  private readonly firestore = inject(Firestore);

  readonly sources = signal<MoneySource[]>([]);
  readonly isLoading = signal(false);

  async getSources(userId: string): Promise<MoneySource[]> {
    this.isLoading.set(true);
    const sourcesRef = collection(this.firestore, `users/${userId}/money-sources`);
    const q = query(sourcesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const sources = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: this.convertTimestamp(doc.data()['createdAt']),
      updatedAt: this.convertTimestamp(doc.data()['updatedAt']),
    })) as MoneySource[];

    this.sources.set(sources);
    this.isLoading.set(false);
    return sources;
  }

  async addSource(
    userId: string,
    data: Omit<MoneySource, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const sourcesRef = collection(this.firestore, `users/${userId}/money-sources`);
    const docRef = await addDoc(sourcesRef, {
      ...data,
      userId,
      createdAt: serverTimestamp(),
    });

    await this.getSources(userId);
    return docRef.id;
  }

  async updateBalance(userId: string, sourceId: string, balance: number): Promise<void> {
    const sourceRef = doc(this.firestore, `users/${userId}/money-sources/${sourceId}`);
    await updateDoc(sourceRef, {
      balance,
      updatedAt: serverTimestamp(),
    });

    await this.getSources(userId);
  }

  private convertTimestamp(timestamp: unknown): string {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    return String(timestamp);
  }
}
