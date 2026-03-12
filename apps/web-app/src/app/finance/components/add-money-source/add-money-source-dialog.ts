import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmDialogImports } from '@spartan-ng/helm/dialog';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { MoneySourceType } from '@qos/shared/models';
import { MoneySourceService } from '../../services/money-source.service';
import { AuthService } from '../../../services/auth.service';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeWalletAdd02 } from '@ng-icons/huge-icons';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'app-add-money-source-dialog',
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
  template: `
    <hlm-dialog>
      <button
        hlmDialogTrigger
        hlmBtn
        variant="outline"
        size="icon"
        hlmTooltip="Add money source"
        [showDelay]="300"
        position="bottom"
        class="rounded-full"
      >
        <ng-icon hlm name="hugeWalletAdd02" />
      </button>
      <hlm-dialog-content *hlmDialogPortal="let ctx" class="sm:max-w-106.25">
        <hlm-dialog-header>
          <h3 hlmDialogTitle>Add Money Source</h3>
          <p hlmDialogDescription>
            Add a new bank account, e-wallet, or cash to track your finances.
          </p>
        </hlm-dialog-header>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="grid gap-4 py-4">
            <div class="grid grid-cols-4 items-center gap-4">
              <label hlmLabel for="name" class="text-right">Name</label>
              <input
                hlmInput
                id="name"
                formControlName="name"
                placeholder="e.g., Chase Bank"
                class="col-span-3"
              />
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
              <label hlmLabel for="type" class="text-right">Type</label>
              <hlm-select class="col-span-3" formControlName="type">
                <hlm-select-trigger>
                  <hlm-select-value placeholder="Select type" />
                </hlm-select-trigger>
                <hlm-select-content>
                  <hlm-select-group>
                    <hlm-select-label>Source Type</hlm-select-label>
                    <hlm-option value="bank">Bank</hlm-option>
                    <hlm-option value="ewallet">E-Wallet</hlm-option>
                    <hlm-option value="cash">Cash</hlm-option>
                  </hlm-select-group>
                </hlm-select-content>
              </hlm-select>
            </div>

            <div class="grid grid-cols-4 items-center gap-4">
              <label hlmLabel for="balance" class="text-right">Balance</label>
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
              {{ isSubmitting() ? 'Adding...' : 'Add Source' }}
            </button>
          </hlm-dialog-footer>
        </form>
      </hlm-dialog-content>
    </hlm-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddMoneySourceDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly moneySourceService = inject(MoneySourceService);
  private readonly authService = inject(AuthService);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
    type: ['bank', Validators.required],
    balance: [0, [Validators.required, Validators.min(0)]],
  });

  isSubmitting = signal(false);

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    const userId = this.authService.currentUser()?.uid;
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
