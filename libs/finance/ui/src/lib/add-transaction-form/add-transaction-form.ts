import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { MoneySource } from '@qos/finance/shared-models';

@Component({
  selector: 'finance-add-transaction-form',
  imports: [
    ReactiveFormsModule,
    BrnSelectImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
  ],
  templateUrl: './add-transaction-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class FinanceAddTransactionForm {
  readonly form = input.required<FormGroup>();
  readonly formId = input.required<string>();
  readonly sources = input.required<MoneySource[]>();
  readonly hasNoSources = input.required<boolean>();
  readonly submitted = output<void>();
}
