import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { MoneySourceStore } from '@qos/finance/data-access';
import { MoneySourceType } from '@qos/finance/shared-models';
import { FinanceAddMoneySourceForm } from '@qos/finance/ui';
import { toast } from 'ngx-sonner';

const ADD_MONEY_SOURCE_FORM_ID = 'add-money-source-form';

@Component({
  selector: 'finance-add-money-source-dialog',
  imports: [ReactiveFormsModule, HlmButtonImports, HlmDialogImports, FinanceAddMoneySourceForm],
  templateUrl: './add-money-source-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceAddMoneySourceDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(BrnDialogRef<boolean | undefined>);
  private readonly moneySourceStore = inject(MoneySourceStore);

  protected readonly formId = ADD_MONEY_SOURCE_FORM_ID;
  protected readonly isSubmitting = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    type: ['bank' as MoneySourceType, Validators.required],
    balance: [0, [Validators.required, Validators.min(0), Validators.pattern('^[0-9]*$')]],
  });

  protected close(): void {
    this.dialogRef.close();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const { balance, name, type } = this.form.getRawValue();

    this.isSubmitting.set(true);
    try {
      await this.moneySourceStore.addSource({
        name: name?.trim() || '',
        type: type ?? 'bank',
        balance: balance ?? 0,
        currency: 'USD',
        isActive: true,
        isPinned: false,
        order: Date.now(),
      });
      toast.success('New source added!');
      this.dialogRef.close(true);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
