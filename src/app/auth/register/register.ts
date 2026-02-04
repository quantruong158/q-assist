import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { passwordMatchValidator } from '../../shared/validators/auth.validators';
import { AuthService } from '../../services/auth.service';
import { GoogleButton } from '../google-button/google-button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  hugeAlert02,
  hugeMail01,
  hugeView,
  hugeViewOffSlash,
  hugeUser,
} from '@ng-icons/huge-icons';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    GoogleButton,
    NgIcon,
  ],
  providers: [provideIcons({ hugeMail01, hugeView, hugeViewOffSlash, hugeAlert02, hugeUser })],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly hidePassword = signal(true);
  protected readonly hideConfirmPassword = signal(true);

  protected readonly registerForm = this.fb.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [passwordMatchValidator] },
  );

  protected async onSubmit(): Promise<void> {
    if (this.registerForm.invalid || this.isLoading()) return;

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
    if (this.isLoading()) return;

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

  protected togglePasswordVisibility(): void {
    this.hidePassword.update((hide) => !hide);
  }

  protected toggleConfirmPasswordVisibility(): void {
    this.hideConfirmPassword.update((hide) => !hide);
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
