import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Transactions } from './components/transactions/transactions';
import { AddMoneySourceDialogComponent } from './components/add-money-source/add-money-source-dialog';
import { EditBalanceDialogComponent } from './components/edit-balance/edit-balance-dialog';
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
import { MoneySourceService } from './services/money-source.service';
import { AuthService } from '../services/auth.service';
import { MoneySource } from './models/money-source.model';

@Component({
  selector: 'app-finance',
  imports: [DecimalPipe, Transactions, AddMoneySourceDialogComponent, NgIcon, HlmButtonImports],
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
  templateUrl: './finance.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex-1 overflow-y-auto pb-4',
  },
})
export class Finance implements OnInit {
  private readonly moneySourceService = inject(MoneySourceService);
  private readonly authService = inject(AuthService);
  private readonly dialogService = inject(HlmDialogService);

  readonly sources = this.moneySourceService.sources;
  readonly totalBalance = computed(() => this.sources().reduce((sum, s) => sum + s.balance, 0));

  readonly mockMonthlyIncome = 3500000;
  readonly mockMonthlyExpenses = 2100000;
  readonly mockTransactionCount = 24;

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.uid;
    if (userId) {
      this.moneySourceService.getSources(userId);
    }
  }

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
    this.dialogService.open(EditBalanceDialogComponent, {
      context: { source },
    });
  }
}
