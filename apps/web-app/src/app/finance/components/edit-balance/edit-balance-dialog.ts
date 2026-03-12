import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { MoneySource } from '../../models/money-source.model';
import { MoneySourceService } from '../../services/money-source.service';

export interface EditBalanceDialogData {
  source: MoneySource;
}

@Component({
  selector: 'app-edit-balance-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
  ],
  template: `
    <hlm-dialog-header>
      <h3 hlmDialogTitle>Update Balance</h3>
      <p hlmDialogDescription>Update the balance for {{ data.source.name }}</p>
    </hlm-dialog-header>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <label hlmLabel for="balance" class="text-right">New Balance</label>
          <input
            hlmInput
            id="balance"
            type="number"
            formControlName="balance"
            placeholder="0.00"
            class="col-span-3"
          />
        </div>
      </div>

      <hlm-dialog-footer>
        <button hlmBtn type="submit" [disabled]="isSubmitting() || form.invalid">
          {{ isSubmitting() ? 'Updating...' : 'Update Balance' }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditBalanceDialogComponent {
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
