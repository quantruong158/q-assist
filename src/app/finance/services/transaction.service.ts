import { Injectable, inject, signal } from '@angular/core';
import { Firestore, collection, query, orderBy, getDocs, getDoc, addDoc, serverTimestamp, Timestamp, doc, limit } from '@angular/fire/firestore';
import { MoneyTransaction, TransactionType } from '../models/transaction.model';

export interface TransactionWithSource extends MoneyTransaction {
  sourceName: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly firestore = inject(Firestore);

  readonly transactions = signal<TransactionWithSource[]>([]);
  readonly isLoading = signal(false);

  async getTransactions(userId: string): Promise<TransactionWithSource[]> {
    this.isLoading.set(true);
    const transactionsRef = collection(this.firestore, `users/${userId}/transactions`);
    const q = query(transactionsRef, orderBy('timestamp', 'desc'), limit(4));
    const snapshot = await getDocs(q);

    const transactions = await Promise.all(
      snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const sourceName = await this.getSourceName(userId, data['sourceId']);
        return {
          id: docSnap.id,
          ...data,
          timestamp: this.convertTimestamp(data['timestamp']),
          sourceName,
        } as TransactionWithSource;
      })
    );

    this.transactions.set(transactions);
    this.isLoading.set(false);
    return transactions;
  }

  private async getSourceName(userId: string, sourceId: string): Promise<string> {
    if (!sourceId) return 'Unknown';
    try {
      const sourceRef = doc(this.firestore, `users/${userId}/money-sources/${sourceId}`);
      const sourceSnap = await getDoc(sourceRef);
      if (sourceSnap.exists()) {
        return sourceSnap.data()['name'] || 'Unknown';
      }
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  async addTransaction(
    userId: string,
    data: Omit<MoneyTransaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const transactionsRef = collection(this.firestore, `users/${userId}/transactions`);
    const docRef = await addDoc(transactionsRef, {
      ...data,
      userId,
      timestamp: serverTimestamp(),
    });

    await this.getTransactions(userId);
    return docRef.id;
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
