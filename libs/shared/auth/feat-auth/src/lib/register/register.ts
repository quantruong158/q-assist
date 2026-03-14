import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@qos/shared/auth/data-access';
import { passwordMatchValidator } from '@qos/shared/auth/util';
import { AuthRegisterForm, RegisterFormGroup } from '@qos/shared/auth/ui';

@Component({
  selector: 'auth-register',
  imports: [AuthRegisterForm],
  template: `
    <auth-register-form
      [form]="registerForm"
      [isLoading]="isLoading()"
      [errorMessage]="errorMessage()"
      (submitted)="onSubmit()"
      (googleClick)="signInWithGoogle()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthRegister {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly registerForm: RegisterFormGroup = this.fb.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordMatchValidator] },
  );

  protected async onSubmit(): Promise<void> {
    if (this.registerForm.invalid || this.isLoading()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const { email, password, displayName } = this.registerForm.getRawValue();
      await this.authService.signUpWithEmail(email, password, displayName);
      await this.router.navigate(['/chat']);
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async signInWithGoogle(): Promise<void> {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      await this.authService.signInWithGoogle();
      await this.router.navigate(['/chat']);
    } catch (error) {
      this.errorMessage.set(this.getErrorMessage(error));
    } finally {
      this.isLoading.set(false);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message;

      if (message.includes('email-already-in-use')) {
        return 'An account with this email already exists.';
      }
      if (message.includes('weak-password')) {
        return 'Password is too weak. Please use a stronger password.';
      }
      if (message.includes('invalid-email')) {
        return 'Please enter a valid email address.';
      }
      if (message.includes('popup-closed-by-user')) {
        return 'Sign in was cancelled.';
      }
    }

    return 'An error occurred. Please try again.';
  }
}
