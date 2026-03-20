import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeAiChat02 } from '@ng-icons/huge-icons';

@Component({
  selector: 'finance-ai-welcome-message',
  imports: [NgIcon],
  providers: [provideIcons({ hugeAiChat02 })],
  template: `
    <div class="flex flex-col items-center text-muted-foreground">
      <ng-icon hlm name="hugeAiChat02" class="text-primary" size="56" />
      <p class="text-sm">Hi! I can help you:</p>
      <ul class="text-xs mt-1 space-y-1">
        <li>• Add a transaction</li>
        <li>• Categorize your latest transaction</li>
      </ul>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceAiWelcomeMessage {}
