import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TransactionService, TransactionWithSource } from '../../services/transaction.service';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeArrowDownRight01, hugeArrowUpRight01, hugeWallet03 } from '@ng-icons/huge-icons';

@Component({
  selector: 'app-finance-transactions',
  imports: [DatePipe, DecimalPipe, HlmSpinnerImports, HlmIconImports, NgIcon],
  providers: [
    provideIcons({
      hugeArrowDownRight01,
      hugeArrowUpRight01,
      hugeWallet03,
    }),
  ],
  templateUrl: './transactions.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Transactions {
  private readonly transactionService = inject(TransactionService);

  protected readonly isLoading = computed(() => this.transactionService.isLoading());
  protected readonly transactions = computed<TransactionWithSource[]>(() =>
    this.transactionService.transactions()
  );
}
