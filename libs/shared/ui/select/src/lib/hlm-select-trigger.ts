import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeArrowDown01 } from '@ng-icons/huge-icons';
import { BrnSelect, BrnSelectTrigger } from '@spartan-ng/brain/select';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { hlm } from '@spartan-ng/helm/utils';
import { cva } from 'class-variance-authority';
import type { ClassValue } from 'clsx';

export const selectTriggerVariants = cva(
  `border-input [&>ng-icon:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 hover:bg-muted hover:text-foreground aria-expanded:bg-muted dark:bg-transparent dark:hover:bg-background/20 dark:aria-expanded:bg-background/20 flex w-fit items-center justify-between gap-2 rounded-md shadow-none bg-transparent px-3 py-2 text-sm whitespace-nowrap transition-[color] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 [&>ng-icon]:pointer-events-none [&>ng-icon]:size-4 [&>ng-icon]:shrink-0 [&>ng-icon]:transition-transform [&>ng-icon]:duration-200 [&>ng-icon]:ease-out [&>ng-icon]:motion-reduce:transition-none [&[aria-expanded='true']>ng-icon]:!-rotate-180 cursor-pointer`,
  {
    variants: {
      error: {
        auto: '[&.ng-invalid.ng-touched]:text-destructive [&.ng-invalid.ng-touched]:border-destructive [&.ng-invalid.ng-touched]:focus-visible:ring-destructive/20 dark:[&.ng-invalid.ng-touched]:focus-visible:ring-destructive/40',
        true: 'text-destructive border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40',
      },
    },
    defaultVariants: {
      error: 'auto',
    },
  },
);

@Component({
  selector: 'hlm-select-trigger',
  imports: [BrnSelectTrigger, NgIcon, HlmIcon],
  providers: [provideIcons({ hugeArrowDown01 })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [class]="_computedClass()"
      #button
      hlmInput
      brnSelectTrigger
      type="button"
      [attr.data-size]="size()"
    >
      <ng-content />
      @if (_icon()) {
        <ng-content select="ng-icon" />
      } @else {
        <ng-icon hlm size="sm" class="ml-2 flex-none" name="hugeArrowDown01" />
      }
    </button>
  `,
})
export class HlmSelectTrigger {
  protected readonly _icon = contentChild(HlmIcon);

  protected readonly _brnSelect = inject(BrnSelect, { optional: true });

  public readonly userClass = input<ClassValue>('', { alias: 'class' });

  public readonly size = input<'default' | 'sm'>('default');

  protected readonly _computedClass = computed(() =>
    hlm(selectTriggerVariants({ error: this._brnSelect?.errorState() }), this.userClass()),
  );
}
