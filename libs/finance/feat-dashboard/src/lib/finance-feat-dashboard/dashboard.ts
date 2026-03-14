import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FinanceTransactionList } from '@qos/finance/ui';
import {
  FinanceAddMoneySourceDialog,
  FinanceAddTransactionDialog,
  FinanceEditBalanceDialog,
} from '@qos/finance/ui';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import {
  hugeArrowUpRight01,
  hugeArrowDownRight01,
  hugeMoneyBag02,
  hugeTransaction,
  hugeBuilding02,
  hugeWallet02,
  hugeCash01,
  hugeEdit02,
} from '@ng-icons/huge-icons';
import { MoneySourceStore } from '@qos/finance/data-access';
import { MoneySource } from '@qos/finance/shared-models';
import { TransactionStore } from '@qos/finance/data-access';

@Component({
  selector: 'finance-dashboard',
  imports: [
    DecimalPipe,
    FinanceTransactionList,
    NgIcon,
    HlmButtonImports,
    FinanceAddMoneySourceDialog,
  ],
  providers: [
    provideIcons({
      hugeArrowDownRight01,
      hugeArrowUpRight01,
      hugeMoneyBag02,
      hugeTransaction,
      hugeBuilding02,
      hugeWallet02,
      hugeCash01,
      hugeEdit02,
    }),
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex-1 overflow-y-auto pb-4',
  },
})
export class FinanceDashboard {
  private readonly moneySourceStore = inject(MoneySourceStore);
  private readonly dialogService = inject(HlmDialogService);
  protected readonly transactionStore = inject(TransactionStore);

  readonly sources = this.moneySourceStore.sources;
  readonly totalBalance = computed(() => this.sources().reduce((sum, s) => sum + s.balance, 0));

  readonly mockMonthlyIncome = 3500000;
  readonly mockMonthlyExpenses = 2100000;
  readonly mockTransactionCount = 24;

  getSourceIcon(type: string): string {
    switch (type) {
      case 'bank':
        return 'hugeBuilding02';
      case 'ewallet':
        return 'hugeWallet02';
      case 'cash':
        return 'hugeCash01';
      default:
        return 'hugeMoneyBag02';
    }
  }

  openEditBalance(source: MoneySource): void {
    this.dialogService.open(FinanceEditBalanceDialog, {
      context: { source },
    });
  }

  openAddTransaction(): void {
    this.dialogService.open(FinanceAddTransactionDialog);
  }
}
