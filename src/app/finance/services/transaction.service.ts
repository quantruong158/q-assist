import { Injectable, inject } from '@angular/core';
import { Firestore, collection, query, orderBy, getDocs, Timestamp } from '@angular/fire/firestore';
import { MoneyTransaction } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly firestore = inject(Firestore);

  async getTransactions(userId: string): Promise<MoneyTransaction[]> {
    const transactionsRef = collection(this.firestore, `users/${userId}/transactions`);
    const q = query(transactionsRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: this.convertTimestamp(doc.data()['timestamp']),
    })) as MoneyTransaction[];
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
