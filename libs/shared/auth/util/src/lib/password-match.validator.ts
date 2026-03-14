import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordMatchValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  if (!password || !confirmPassword) {
    return null;
  }

  if (password.value !== confirmPassword.value && confirmPassword.value) {
    confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
    return { passwordMismatch: true };
  }

  if (confirmPassword.hasError('passwordMismatch')) {
    const { passwordMismatch, ...remainingErrors } = confirmPassword.errors ?? {};
    confirmPassword.setErrors(Object.keys(remainingErrors).length > 0 ? remainingErrors : null);
  }

  return null;
};
