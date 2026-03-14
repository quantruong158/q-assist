import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@qos/shared/auth/data-access';
import { AuthLoginForm, LoginFormGroup } from '@qos/shared/auth/ui';

@Component({
  selector: 'auth-login',
  imports: [AuthLoginForm],
  template: `
    <auth-login-form
      [form]="loginForm"
      [isLoading]="isLoading()"
      [errorMessage]="errorMessage()"
      (submitted)="onSubmit()"
      (googleClick)="signInWithGoogle()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLogin {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly loginForm: LoginFormGroup = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.isLoading()) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const { email, password } = this.loginForm.getRawValue();
      await this.authService.signInWithEmail(email, password);
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

      if (message.includes('user-not-found')) {
        return 'No account found with this email.';
      }
      if (message.includes('wrong-password') || message.includes('invalid-credential')) {
        return 'Incorrect email or password.';
      }
      if (message.includes('too-many-requests')) {
        return 'Too many attempts. Please try again later.';
      }
      if (message.includes('popup-closed-by-user')) {
        return 'Sign in was cancelled.';
      }
    }

    return 'An error occurred. Please try again.';
  }
}
