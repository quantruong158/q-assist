import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { BrnSelectImports } from '@spartan-ng/brain/select';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSelectImports } from '@spartan-ng/helm/select';
import { HlmSwitchImports } from '@spartan-ng/helm/switch';
import { FinanceMoneyFormatterDirective } from '@qos/shared/util-angular';

@Component({
  selector: 'finance-edit-money-source-form',
  imports: [
    ReactiveFormsModule,
    BrnSelectImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSelectImports,
    HlmSwitchImports,
    FinanceMoneyFormatterDirective,
  ],
  templateUrl: './edit-money-source-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
})
export class FinanceEditMoneySourceForm {
  readonly form = input.required<FormGroup>();
  readonly formId = input.required<string>();
  readonly submitted = output<void>();
}
