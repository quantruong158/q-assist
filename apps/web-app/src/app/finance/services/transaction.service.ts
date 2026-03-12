import { computed, Injectable, inject, resource } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  serverTimestamp,
  limit,
} from '@angular/fire/firestore';
import { AuthService } from '../../services/auth.service';
import { MoneyTransaction } from '@qos/shared/models';
import { MoneySource } from '@qos/shared/models';
import { MoneySourceService } from './money-source.service';
import { convertTimestamp } from '../../shared/utils/time.utils';

const RECENT_TRANSACTIONS_LIMIT = 4;

export interface TransactionWithSource extends MoneyTransaction {
  sourceName: string;
}

@Injectable({ providedIn: 'root' })
export class TransactionService {
  private readonly firestore = inject(Firestore);
  private readonly authService = inject(AuthService);
  private readonly moneySourceService = inject(MoneySourceService);
  private readonly currentUser = computed(() => this.authService.currentUser());

  private readonly transactionsResource = resource<
    MoneyTransaction[],
    { userId: string } | undefined
  >({
    params: () => {
      const user = this.currentUser();
      return user ? { userId: user.uid } : undefined;
    },
    loader: async ({ params }) => {
      const transactionsRef = collection(this.firestore, `users/${params.userId}/transactions`);
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
    },
    defaultValue: [],
  });

  readonly transactions = computed<TransactionWithSource[]>(() =>
    this.mapTransactions(this.transactionsResource.value(), this.moneySourceService.sources()),
  );

  readonly isLoading = computed(() => this.transactionsResource.isLoading());

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

    this.transactionsResource.reload();
    return docRef.id;
  }

  reload(): void {
    this.transactionsResource.reload();
  }

  private getSourceName(sourceId: string, sources: MoneySource[]): string {
    if (!sourceId || sources.length === 0) {
      return 'Unknown';
    }

    return sources.find((source) => source.id === sourceId)?.name || 'Unknown';
  }

  private mapTransactions(
    transactions: MoneyTransaction[],
    sources: MoneySource[],
  ): TransactionWithSource[] {
    return transactions.map((transaction) => ({
      ...transaction,
      sourceName: this.getSourceName(transaction.sourceId, sources),
    }));
  }
}
