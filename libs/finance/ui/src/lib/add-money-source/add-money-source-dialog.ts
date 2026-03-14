import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeWalletAdd02 } from '@ng-icons/huge-icons';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';
import { MoneySourceType } from '@qos/finance/shared-models';
import { MoneySourceService } from '@qos/finance/data-access';
import { AuthStore } from '@qos/shared/auth/data-access';

@Component({
  selector: 'finance-add-money-source-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButtonImports,
    HlmDialogImports,
    HlmInputImports,
    HlmLabelImports,
    BrnSelectImports,
    HlmSelectImports,
    HlmTooltipImports,
    NgIcon,
  ],
  providers: [
    provideIcons({
      hugeWalletAdd02,
    }),
  ],
  templateUrl: './add-money-source-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceAddMoneySourceDialog {
  private readonly fb = inject(FormBuilder);
  private readonly moneySourceService = inject(MoneySourceService);
  private readonly authStore = inject(AuthStore);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    type: ['bank', Validators.required],
    balance: [0, [Validators.required, Validators.min(0)]],
  });

  isSubmitting = signal(false);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const userId = this.authStore.currentUser()?.uid;
    if (!userId) return;

    this.isSubmitting.set(true);
    try {
      const { name, type, balance } = this.form.value;
      await this.moneySourceService.addSource(userId, {
        name: name.trim(),
        type: type as MoneySourceType,
        balance: balance || 0,
        currency: 'USD',
        isActive: true,
      });
      this.form.reset({ type: 'bank' });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
