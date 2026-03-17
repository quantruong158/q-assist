import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  limit,
  doc,
  updateDoc,
} from '@angular/fire/firestore';
import { MoneyTransaction, FinanceCategoryId } from '@qos/finance/shared-models';
import { convertTimestamp } from '@qos/shared/util-angular';

const RECENT_TRANSACTIONS_LIMIT = 4;

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly firestore = inject(Firestore);

  async getTransactions(userId: string): Promise<MoneyTransaction[]> {
    const transactionsRef = collection(this.firestore, `users/${userId}/transactions`);
    const q = query(
      transactionsRef,
      orderBy('timestamp', 'desc'),
      limit(RECENT_TRANSACTIONS_LIMIT),
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        timestamp: convertTimestamp(data['timestamp']),
      } as MoneyTransaction;
    });
  }

  async addTransaction(
    userId: string,
    data: Omit<MoneyTransaction, 'id' | 'userId' | 'timestamp' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const transactionsRef = collection(this.firestore, `users/${userId}/transactions`);
    const docRef = await addDoc(transactionsRef, {
      ...data,
      userId,
      timestamp: serverTimestamp(),
    });

    return docRef.id;
  }

  async updateTransactionCategory(
    userId: string,
    transactionId: string,
    categoryId: FinanceCategoryId,
  ): Promise<void> {
    const transactionRef = doc(this.firestore, `users/${userId}/transactions/${transactionId}`);
    await updateDoc(transactionRef, {
      categoryId,
      updatedAt: serverTimestamp(),
    });
  }
}
