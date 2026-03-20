import { computed, Injectable, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AuthStore } from '@qos/shared/auth/data-access';
import { MoneySourceStore } from '../store/money-source.store';
import { TransactionService } from '../services/transaction.service';
import { MoneyTransaction, MoneySource, TransactionWithSource } from '@qos/finance/shared-models';

@Injectable({ providedIn: 'root' })
export class TransactionStore {
  private readonly authStore = inject(AuthStore);
  private readonly moneySourceStore = inject(MoneySourceStore);
  private readonly transactionService = inject(TransactionService);

  private readonly transactionsResource = rxResource<
    MoneyTransaction[],
    { userId: string } | undefined
  >({
    params: () => {
      const user = this.authStore.currentUser();
      return user ? { userId: user.uid } : undefined;
    },
    stream: ({ params }) => this.transactionService.getRealtimeTransactions(params.userId),
    defaultValue: [],
  });

  readonly transactions = computed<TransactionWithSource[]>(() =>
    this.mapTransactions(this.transactionsResource.value(), this.moneySourceStore.sources()),
  );
  readonly isLoading = computed(() => this.transactionsResource.isLoading());

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
