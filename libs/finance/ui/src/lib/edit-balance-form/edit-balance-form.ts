import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';

@Component({
  selector: 'finance-edit-balance-form',
  imports: [ReactiveFormsModule, HlmInputImports, HlmLabelImports],
  templateUrl: './edit-balance-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class FinanceEditBalanceForm {
  readonly form = input.required<FormGroup>();
  readonly formId = input.required<string>();
  readonly submitted = output<void>();
}
