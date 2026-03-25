import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { MoneySource } from '@qos/finance/shared-models';
import { hugePin, hugeEdit02 } from '@ng-icons/huge-icons';
import { provideIcons } from '@ng-icons/core';
import { HlmTooltipImports } from '@spartan-ng/helm/tooltip';

@Component({
  selector: 'finance-money-source-card',
  imports: [DecimalPipe, NgIcon, HlmButtonImports, HlmTooltipImports],
  providers: [
    provideIcons({
      hugePin,
      hugeEdit02,
    }),
  ],
  host: {
    class: 'block',
  },
  template: `
    <div class="rounded-xl border bg-card p-4 group min-w-55 cursor-move select-none">
      <div class="flex items-center gap-3">
        <div
          class="flex items-center justify-center rounded-full cursor-grab"
          title="Drag to reorder"
        >
          <ng-icon hlm [name]="iconName()" class="text-muted-foreground" />
        </div>
        <div class="flex-1">
          <p class="font-medium">{{ source().name }}</p>
        </div>
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          class="rounded-full transition-opacity duration-160 ease-out text-foreground hover:text-foreground"
          [class]="
            source().isPinned
              ? 'opacity-100 text-primary hover:text-primary'
              : 'opacity-0 group-hover:opacity-100'
          "
          (click)="onPinToggle(); $event.stopPropagation()"
          [attr.aria-label]="source().isPinned ? 'Unpin source' : 'Pin source'"
        >
          <ng-icon hlm name="hugePin" />
        </button>
      </div>
      <div class="flex items-center justify-between">
        <p class="text-lg font-medium">{{ source().balance | number }}</p>
        <button
          hlmBtn
          variant="ghost"
          size="icon"
          (click)="onEditBalance(); $event.stopPropagation()"
          class="opacity-0 group-hover:opacity-100 hover:text-foreground rounded-full transition-opacity duration-160 ease-out"
          aria-label="Edit balance"
        >
          <ng-icon hlm name="hugeEdit02" />
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceMoneySourceCard {
  readonly source = input.required<MoneySource>();

  readonly pinToggle = output<MoneySource>();
  readonly editMoneySource = output<MoneySource>();

  readonly iconName = computed(() => {
    switch (this.source().type) {
      case 'bank':
        return 'hugeBuilding02';
      case 'ewallet':
        return 'hugeWallet02';
      case 'cash':
        return 'hugeCash01';
      default:
        return 'hugeMoneyBag02';
    }
  });

  onPinToggle(): void {
    this.pinToggle.emit(this.source());
  }

  onEditBalance(): void {
    this.editMoneySource.emit(this.source());
  }
}
