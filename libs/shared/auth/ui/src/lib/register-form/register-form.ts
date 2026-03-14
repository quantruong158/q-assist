import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeAlert02,
  hugeMail01,
  hugeUser,
  hugeView,
  hugeViewOffSlash,
} from '@ng-icons/huge-icons';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmFormFieldImports } from '@spartan-ng/helm/form-field';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmInputGroupImports } from '@spartan-ng/helm/input-group';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSpinnerImports } from '@spartan-ng/helm/spinner';
import { AuthGoogleButton } from '../google-button/google-button';

export type RegisterFormGroup = FormGroup<{
  displayName: FormControl<string>;
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}>;

@Component({
  selector: 'auth-register-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmAlertImports,
    HlmButtonImports,
    HlmCardImports,
    HlmFormFieldImports,
    HlmIconImports,
    HlmInputGroupImports,
    HlmLabelImports,
    HlmSeparatorImports,
    HlmSpinnerImports,
    AuthGoogleButton,
    NgIcon,
  ],
  providers: [provideIcons({ hugeMail01, hugeView, hugeViewOffSlash, hugeAlert02, hugeUser })],
  templateUrl: './register-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthRegisterForm {
  readonly form = input.required<RegisterFormGroup>();
  readonly isLoading = input(false);
  readonly errorMessage = input('');

  readonly submitted = output<void>();
  readonly googleClick = output<void>();

  protected readonly hidePassword = signal(true);
  protected readonly hideConfirmPassword = signal(true);

  protected togglePasswordVisibility(): void {
    this.hidePassword.update((hide) => !hide);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.update((hide) => !hide);
  }
}
