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
import { AuthService } from '../../../services/auth.service';
import { TransactionType } from '@qos/shared/models';
import { MoneySourceService } from '../../services/money-source.service';
import { TransactionService } from '../../services/transaction.service';

@Component({
  selector: 'app-add-transaction-dialog',
  imports: [
    ReactiveFormsModule,
    BrnSelectImports,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
  ],
  template: `
    <hlm-dialog-header>
      <h3 hlmDialogTitle>Add Transaction</h3>
      <p hlmDialogDescription>Log a new income or expense entry for one of your money sources.</p>
    </hlm-dialog-header>

    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <label hlmLabel for="type" class="text-right">Type</label>
          <hlm-select class="col-span-3" formControlName="type">
            <hlm-select-trigger id="type">
              <hlm-select-value placeholder="Select type" />
            </hlm-select-trigger>
            <hlm-select-content>
              <hlm-select-group>
                <hlm-select-label>Transaction Type</hlm-select-label>
                <hlm-option value="income">Income</hlm-option>
                <hlm-option value="expense">Expense</hlm-option>
              </hlm-select-group>
            </hlm-select-content>
          </hlm-select>
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <label hlmLabel for="amount" class="text-right">Amount</label>
          <input
            hlmInput
            id="amount"
            type="number"
            min="0"
            step="0.01"
            formControlName="amount"
            placeholder="0.00"
            class="col-span-3"
          />
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <label hlmLabel for="source" class="text-right">Source</label>
          <hlm-select class="col-span-3" formControlName="sourceId">
            <hlm-select-trigger id="source">
              <hlm-select-value placeholder="Select source" />
            </hlm-select-trigger>
            <hlm-select-content>
              <hlm-select-group>
                <hlm-select-label>Money Source</hlm-select-label>
                @for (source of sources(); track source.id) {
                  <hlm-option [value]="source.id">{{ source.name }}</hlm-option>
                }
              </hlm-select-group>
            </hlm-select-content>
          </hlm-select>
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <label hlmLabel for="merchant" class="text-right">Merchant</label>
          <input
            hlmInput
            id="merchant"
            formControlName="merchant"
            placeholder="Optional"
            class="col-span-3"
          />
        </div>

        <div class="grid grid-cols-4 items-center gap-4">
          <label hlmLabel for="description" class="text-right">Details</label>
          <input
            hlmInput
            id="description"
            formControlName="description"
            placeholder="Optional note"
            class="col-span-3"
          />
        </div>

        @if (hasNoSources()) {
          <p class="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
            Add a money source before logging a transaction.
          </p>
        }
      </div>

      <hlm-dialog-footer>
        <button hlmBtn type="button" variant="ghost" (click)="close()">Cancel</button>
        <button hlmBtn type="submit" [disabled]="isSubmitting() || form.invalid || hasNoSources()">
          {{ isSubmitting() ? 'Saving...' : 'Add Transaction' }}
        </button>
      </hlm-dialog-footer>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTransactionDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly dialogRef = inject(BrnDialogRef<boolean | undefined>);
  private readonly moneySourceService = inject(MoneySourceService);
  private readonly transactionService = inject(TransactionService);

  readonly sources = this.moneySourceService.sources;
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

    const userId = this.authService.currentUser()?.uid;
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
