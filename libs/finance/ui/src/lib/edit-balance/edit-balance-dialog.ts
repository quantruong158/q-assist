import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { MoneySource } from '@qos/finance/shared-models';
import { MoneySourceService } from '@qos/finance/data-access';

export interface EditBalanceDialogData {
  source: MoneySource;
}

@Component({
  selector: 'finance-edit-balance-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  templateUrl: './edit-balance-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceEditBalanceDialog {
  private readonly fb = inject(FormBuilder);
  private readonly moneySourceService = inject(MoneySourceService);
  private readonly dialogRef = inject(BrnDialogRef);

  readonly data = injectBrnDialogContext<EditBalanceDialogData>();

  form: FormGroup = this.fb.group({
    balance: [this.data.source.balance, [Validators.required, Validators.min(0)]],
  });

  isSubmitting = signal(false);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const { source } = this.data;
    this.isSubmitting.set(true);

    try {
      await this.moneySourceService.updateBalance(
        source.userId,
        source.id,
        this.form.value.balance,
      );
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Failed to update balance:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
