import { ChangeDetectionStrategy, Component, computed, inject, resource } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { TransactionService } from '../../services/transaction.service';
import { MoneyTransaction } from '../../models/transaction.model';
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
  private readonly authService = inject(AuthService);
  private readonly transactionService = inject(TransactionService);

  protected readonly currentUser = computed(() => this.authService.currentUser());

  readonly transactions = resource<MoneyTransaction[], { userId: string } | undefined>({
    params: () => {
      const user = this.currentUser();
      return user ? { userId: user.uid } : undefined;
    },
    loader: async ({ params }) => {
      return this.transactionService.getTransactions(params.userId);
    },
    defaultValue: [],
  });

  protected readonly isLoading = computed(() => this.transactions.isLoading());
  protected readonly transactionsList = computed(() => this.transactions.value());
}
