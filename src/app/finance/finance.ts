import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Transactions } from './components/transactions/transactions';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeArrowUpRight01,
  hugeArrowDownRight01,
  hugeMoneyBag02,
  hugeTransaction,
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-finance',
  imports: [DecimalPipe, Transactions, NgIcon],
  providers: [
    provideIcons({
      hugeArrowDownRight01,
      hugeArrowUpRight01,
      hugeMoneyBag02,
      hugeTransaction,
    }),
  ],
  templateUrl: './finance.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex-1 overflow-y-auto pb-4',
  },
})
export class Finance {
  protected readonly mockTotalBalance = 12500000;
  protected readonly mockMonthlyIncome = 3500000;
  protected readonly mockMonthlyExpenses = 2100000;
  protected readonly mockTransactionCount = 24;
}
