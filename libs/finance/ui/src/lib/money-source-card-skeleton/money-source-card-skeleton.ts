import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'finance-money-source-card-skeleton',
  template: `
    <div class="rounded-xl border bg-card px-4 py-5 w-55 animate-pulse flex flex-col gap-4">
      <div class="flex items-center gap-2">
        <div class="h-6 w-6 rounded-full bg-muted"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 w-20 rounded bg-muted"></div>
        </div>
      </div>
      <div class="h-6 w-24 rounded bg-muted"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceMoneySourceCardSkeleton {}
