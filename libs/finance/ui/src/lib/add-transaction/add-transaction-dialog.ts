import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { BrnSelectImports } from '@spartan-ng/brain/select';

import { HlmButtonImports } from '@spartan-ng/helm/button';

import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { TransactionType } from '@qos/finance/shared-models';
import { MoneySourceStore } from '@qos/finance/data-access';
import { TransactionService } from '@qos/finance/data-access';
import { AuthStore } from '@qos/shared/auth/data-access';

@Component({
  selector: 'finance-add-transaction-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    BrnSelectImports,
    HlmSelectImports,
  ],
  templateUrl: './add-transaction-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceAddTransactionDialog {
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly dialogRef = inject(BrnDialogRef<boolean | undefined>);
  private readonly moneySourceStore = inject(MoneySourceStore);
  private readonly transactionService = inject(TransactionService);

  readonly sources = this.moneySourceStore.sources;
  readonly hasNoSources = computed(() => this.sources().length === 0);

  readonly form: FormGroup = this.fb.group({
    type: ['expense' as TransactionType, Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    sourceId: ['', Validators.required],
    merchant: [''],
    description: [''],
  });

  readonly isSubmitting = signal(false);

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

  async onSubmit(): Promise<void> {
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
        description: description?.trim() || null,
        merchant: merchant?.trim() || null,
        sourceId,
        type: type as TransactionType,
      });
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Failed to add transaction:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
