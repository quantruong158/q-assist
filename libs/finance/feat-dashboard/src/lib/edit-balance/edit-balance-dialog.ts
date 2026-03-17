import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { MoneySourceService, MoneySourceStore } from '@qos/finance/data-access';
import { FinanceEditBalanceForm } from '@qos/finance/ui';
import { MoneySource } from '@qos/finance/shared-models';

const EDIT_BALANCE_FORM_ID = 'edit-balance-form';

export interface EditBalanceDialogData {
  source: MoneySource;
}

@Component({
  selector: 'finance-edit-balance-dialog',
  imports: [ReactiveFormsModule, HlmButtonImports, HlmDialogImports, FinanceEditBalanceForm],
  templateUrl: './edit-balance-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceEditBalanceDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(BrnDialogRef<boolean | undefined>);
  private readonly moneySourceService = inject(MoneySourceService);
  private readonly moneySourceStore = inject(MoneySourceStore);

  readonly data = injectBrnDialogContext<EditBalanceDialogData>();
  readonly formId = EDIT_BALANCE_FORM_ID;
  readonly isSubmitting = signal(false);
  readonly form = this.fb.group({
    balance: [this.data.source.balance, [Validators.required, Validators.min(0)]],
  });

  protected close(): void {
    this.dialogRef.close();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const { source } = this.data;
    const { balance } = this.form.getRawValue();

    this.isSubmitting.set(true);
    try {
      await this.moneySourceService.updateBalance(source.userId, source.id, balance ?? 0);
      this.moneySourceStore.reload();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Failed to update balance:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
