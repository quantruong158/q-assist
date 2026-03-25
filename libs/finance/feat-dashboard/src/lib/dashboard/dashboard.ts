import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import {
  FinanceTransactionList,
  FinanceMoneySourceCard,
  FinanceMoneySourceCardSkeleton,
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
  hugeWalletAdd02,
  hugePin,
} from '@ng-icons/huge-icons';
import { MoneySourceStore } from '@qos/finance/data-access';
import { MoneySource } from '@qos/finance/shared-models';
import { TransactionStore } from '@qos/finance/data-access';
import { FinanceAddMoneySourceDialog } from '../add-money-source/add-money-source-dialog';
import { FinanceAddTransactionDialog } from '../add-transaction/add-transaction-dialog';
import { FinanceEditMoneySourceDialog } from '../edit-money-source/edit-money-source-dialog';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { FinanceAiWidget } from '../finance-ai-widget/finance-ai-widget';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
  selector: 'finance-dashboard',
  imports: [
    DecimalPipe,
    FinanceTransactionList,
    FinanceMoneySourceCard,
    FinanceMoneySourceCardSkeleton,
    NgIcon,
    HlmButtonImports,
    HlmTooltipImports,
    FinanceAiWidget,
    DragDropModule,
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
      hugeWalletAdd02,
      hugePin,
    }),
  ],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex-1 overflow-y-auto pb-4',
  },
  styles: `
    .cdk-drag-placeholder {
      border-radius: var(--radius-xl);
      opacity: 0.4;
      outline: 2px dashed var(--muted-foreground);
    }

    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0.32, 0.72, 0, 1);
    }

    .drag-container.cdk-drop-list-dragging .draggable:not(.cdk-drag-placeholder) {
      transition: transform 150ms ease-out;
    }
  `,
})
export class FinanceDashboard {
  private readonly moneySourceStore = inject(MoneySourceStore);
  private readonly dialogService = inject(HlmDialogService);
  protected readonly transactionStore = inject(TransactionStore);

  protected readonly sources = this.moneySourceStore.sources;
  protected readonly totalBalance = computed(() =>
    this.sources().reduce((sum, s) => sum + s.balance, 0),
  );

  protected readonly pinnedSources = computed(() =>
    this.sources()
      .filter((s) => s.isPinned)
      .sort((a, b) => a.order - b.order),
  );

  protected readonly unpinnedSources = computed(() =>
    this.sources()
      .filter((s) => !s.isPinned)
      .sort((a, b) => a.order - b.order),
  );

  protected readonly isSourcesLoading = computed(
    () => this.moneySourceStore.isLoading() && this.sources().length === 0,
  );

  protected readonly mockMonthlyIncome = 3500000;
  protected readonly mockMonthlyExpenses = 2100000;
  protected readonly mockTransactionCount = 24;

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

  openEditMoneySource(source: MoneySource): void {
    this.dialogService.open(FinanceEditMoneySourceDialog, {
      context: { source },
      contentClass: 'w-lg',
    });
  }

  openAddMoneySource(): void {
    this.dialogService.open(FinanceAddMoneySourceDialog);
  }

  openAddTransaction(): void {
    this.dialogService.open(FinanceAddTransactionDialog);
  }

  async onPinToggle(source: MoneySource): Promise<void> {
    await this.moneySourceStore.togglePin(source.id, !source.isPinned);
  }

  async onPinnedDrop(event: CdkDragDrop<MoneySource[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    const updatedIds = [...this.pinnedSources().map((s) => s.id)];
    const [movedId] = updatedIds.splice(event.previousIndex, 1);
    updatedIds.splice(event.currentIndex, 0, movedId);
    await this.moneySourceStore.reorderPinned(updatedIds);
  }

  async onUnpinnedDrop(event: CdkDragDrop<MoneySource[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    const updatedIds = [...this.unpinnedSources().map((s) => s.id)];
    const [movedId] = updatedIds.splice(event.previousIndex, 1);
    updatedIds.splice(event.currentIndex, 0, movedId);
    await this.moneySourceStore.reorderUnpinned(updatedIds);
  }
}
