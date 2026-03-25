import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { MoneySourceStore } from '@qos/finance/data-access';
import { FinanceEditMoneySourceForm } from '@qos/finance/ui';
import { MoneySource, MoneySourceType } from '@qos/finance/shared-models';
import { ConfirmationDialog } from '@qos/shared/ui-shell';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeDelete02 } from '@ng-icons/huge-icons';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';

const EDIT_MONEY_SOURCE_FORM_ID = 'edit-money-source-form';

export interface EditMoneySourceDialogData {
  source: MoneySource;
}

@Component({
  selector: 'finance-edit-money-source-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    FinanceEditMoneySourceForm,
    NgIcon,
  ],
  providers: [provideIcons({ hugeDelete02 })],
  templateUrl: './edit-money-source-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceEditMoneySourceDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(BrnDialogRef<boolean | undefined>);
  private readonly dialogService = inject(HlmDialogService);
  private readonly moneySourceStore = inject(MoneySourceStore);

  protected readonly data = injectBrnDialogContext<EditMoneySourceDialogData>();
  protected readonly formId = EDIT_MONEY_SOURCE_FORM_ID;
  protected readonly isSubmitting = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    name: [this.data.source.name, [Validators.required, Validators.minLength(1)]],
    type: [this.data.source.type as MoneySourceType, Validators.required],
    balance: [this.data.source.balance, [Validators.required, Validators.min(0)]],
    isPinned: [this.data.source.isPinned],
  });

  protected close(): void {
    this.dialogRef.close();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const { source } = this.data;
    const { name, type, balance, isPinned } = this.form.getRawValue();

    this.isSubmitting.set(true);
    try {
      await this.moneySourceStore.updateSource(source.id, {
        name: name?.trim() || '',
        type,
        balance,
        isPinned,
      });
      toast.success('Source updated!');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Failed to update money source:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async delete(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialogService.open(ConfirmationDialog, {
        context: {
          title: 'Delete Money Source',
          message: `Are you sure you want to delete "${this.data.source.name}"? This action cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
        },
      }).closed$,
    );

    if (!confirmed) {
      return;
    }

    const { source } = this.data;
    this.isSubmitting.set(true);
    try {
      await this.moneySourceStore.deleteSource(source.id);
      toast.success('Source deleted!');
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Failed to delete money source:', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
