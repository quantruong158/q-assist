import { CurrencyPipe, DOCUMENT } from '@angular/common';
import { Directive, ElementRef, forwardRef, inject, input, signal } from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { type ChangeFn, type TouchFn } from '@spartan-ng/brain/forms';

const MONEY_FORMATTER_VALUE_ACCESSOR = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => FinanceMoneyFormatterDirective),
  multi: true,
};

@Directive({
  selector: 'input[financeMoneyFormatter]',
  providers: [MONEY_FORMATTER_VALUE_ACCESSOR, CurrencyPipe],
  host: {
    '(blur)': 'handleBlur()',
    '(input)': 'handleInput($event)',
  },
})
export class FinanceMoneyFormatterDirective implements ControlValueAccessor {
  private readonly elementRef = inject(ElementRef<HTMLInputElement>);
  private readonly currencyPipe = inject(CurrencyPipe);
  private readonly document = inject(DOCUMENT);

  readonly currencyCode = input('VND', { alias: 'financeMoneyFormatterCurrencyCode' });
  readonly locale = input('vi-VN', { alias: 'financeMoneyFormatterLocale' });
  readonly digitsInfo = input('1.0-0', { alias: 'financeMoneyFormatterDigitsInfo' });

  private readonly value = signal<number | null>(null);

  private _onChange?: ChangeFn<number | null>;
  private _onTouched?: TouchFn;

  protected handleBlur(): void {
    this._onTouched?.();
    this.renderDisplayValue();
  }

  protected handleInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const selectionStart = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = this.countDigits(input.value.slice(0, selectionStart));
    const rawValue = input.value;
    const value = this.parseInputValue(rawValue);

    this.value.set(value);
    this._onChange?.(value);
    this.renderDisplayValue(digitsBeforeCursor);
  }

  writeValue(value: number | string | null): void {
    this.value.set(this.normalizeValue(value));
    this.renderDisplayValue();
  }

  registerOnChange(fn: ChangeFn<number | null>): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: TouchFn): void {
    this._onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.elementRef.nativeElement.disabled = isDisabled;
  }

  private renderDisplayValue(digitsBeforeCursor?: number): void {
    const formattedValue = this.formatDisplayValue(this.value());
    this.setNativeValue(formattedValue);

    if (digitsBeforeCursor !== undefined) {
      this.restoreCaret(formattedValue, digitsBeforeCursor);
    }
  }

  private formatDisplayValue(value: number | null): string {
    if (value === null) {
      return '';
    }

    try {
      return (
        this.currencyPipe.transform(
          value,
          this.currencyCode(),
          'symbol',
          this.digitsInfo(),
          this.locale(),
        ) ?? ''
      );
    } catch {
      return new Intl.NumberFormat(this.locale(), {
        style: 'currency',
        currency: this.currencyCode(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
  }

  private parseInputValue(rawValue: string): number | null {
    const digitsOnly = rawValue.replace(/[^\d-]/g, '');

    if (!digitsOnly || digitsOnly === '-') {
      return null;
    }

    const parsed = Number.parseInt(digitsOnly, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeValue(value: number | string | null): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? Math.trunc(value) : null;
    }

    return this.parseInputValue(value);
  }

  private countDigits(value: string): number {
    return (value.match(/\d/g) ?? []).length;
  }

  private restoreCaret(formattedValue: string, digitsBeforeCursor: number): void {
    const caretIndex = this.findCaretIndexAfterDigits(formattedValue, digitsBeforeCursor);

    queueMicrotask(() => {
      const input = this.elementRef.nativeElement;
      if (this.document.activeElement !== input) {
        return;
      }

      input.setSelectionRange(caretIndex, caretIndex);
    });
  }

  private findCaretIndexAfterDigits(formattedValue: string, digitsBeforeCursor: number): number {
    if (digitsBeforeCursor <= 0) {
      return 0;
    }

    let digitsSeen = 0;
    for (let index = 0; index < formattedValue.length; index += 1) {
      if (/\d/.test(formattedValue[index])) {
        digitsSeen += 1;
        if (digitsSeen >= digitsBeforeCursor) {
          return index + 1;
        }
      }
    }

    return formattedValue.length;
  }

  private setNativeValue(value: string): void {
    this.elementRef.nativeElement.value = value;
  }
}
