import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeArrowDownRight01, hugeArrowUpRight01, hugeWallet03 } from '@ng-icons/huge-icons';
import { TransactionWithSource } from '@qos/finance/shared-models';

@Component({
  selector: 'finance-transaction-list',
  imports: [DatePipe, DecimalPipe, HlmSpinnerImports, HlmIconImports, NgIcon],
  providers: [
    provideIcons({
      hugeArrowDownRight01,
      hugeArrowUpRight01,
      hugeWallet03,
    }),
  ],
  templateUrl: './transaction-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceTransactionList {
  readonly transactions = input.required<TransactionWithSource[]>();
  readonly isLoading = input.required<boolean>();
}
