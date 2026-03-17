import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { MoneySourceStore, TransactionService, TransactionStore } from '@qos/finance/data-access';
import { FinanceAddTransactionForm } from '@qos/finance/ui';
import { TransactionType } from '@qos/finance/shared-models';
import { AuthStore } from '@qos/shared/auth/data-access';

const ADD_TRANSACTION_FORM_ID = 'add-transaction-form';

@Component({
  selector: 'finance-add-transaction-dialog',
  imports: [ReactiveFormsModule, HlmButtonImports, HlmDialogImports, FinanceAddTransactionForm],
  templateUrl: './add-transaction-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceAddTransactionDialog {
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(BrnDialogRef<boolean | undefined>);
  private readonly moneySourceStore = inject(MoneySourceStore);
  private readonly transactionService = inject(TransactionService);
  private readonly transactionStore = inject(TransactionStore);

  readonly formId = ADD_TRANSACTION_FORM_ID;
  readonly sources = this.moneySourceStore.sources;
  readonly hasNoSources = computed(() => this.sources().length === 0);
  readonly isSubmitting = signal(false);
  readonly form = this.fb.group({
    type: ['expense' as TransactionType, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    sourceId: ['', Validators.required],
    merchant: [''],
    description: [''],
  });

  constructor() {
    effect(() => {
      const currentSourceId = this.form.get('sourceId')?.value;
      const firstSourceId = this.sources()[0]?.id;
      if (!currentSourceId && firstSourceId) {
        this.form.patchValue({ sourceId: firstSourceId });
      }
    });
  }

  protected close(): void {
    this.dialogRef.close();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.hasNoSources()) {
      return;
    }

    const userId = this.authStore.currentUser()?.uid;
    if (!userId) {
      return;
    }

    const { amount, description, merchant, sourceId, type } = this.form.getRawValue();

    this.isSubmitting.set(true);
    try {
      await this.transactionService.addTransaction(userId, {
        amount: Number(amount),
        currency: 'VND',
        description: description?.trim() || undefined,
        merchant: merchant?.trim() || undefined,
        sourceId: sourceId ?? '',
        type: type ?? 'expense',
      });
      this.transactionStore.reload();
      this.moneySourceStore.reload();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Failed to add transaction:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
