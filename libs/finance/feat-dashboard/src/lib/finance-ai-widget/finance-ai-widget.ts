import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { hugeAiChat02, hugeArrowUp02, hugeCancel01 } from '@ng-icons/huge-icons';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { ChatMessageList } from '@qos/chat/ui';
import { FinanceAiService } from '@qos/finance/data-access';
import { TransactionStore, MoneySourceStore } from '@qos/finance/data-access';
import { toSignal } from '@angular/core/rxjs-interop';

interface WidgetMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Component({
  selector: 'finance-ai-widget',
  imports: [ReactiveFormsModule, NgIcon, HlmButtonImports, ChatMessageList],
  providers: [provideIcons({ hugeAiChat02, hugeArrowUp02, hugeCancel01 })],
  templateUrl: './finance-ai-widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceAiWidget {
  private readonly financeAiService = inject(FinanceAiService);
  private readonly transactionStore = inject(TransactionStore);
  private readonly moneySourceStore = inject(MoneySourceStore);

  readonly isOpen = signal(false);
  readonly messages = signal<WidgetMessage[]>([]);
  readonly isLoading = signal(false);
  readonly sessionId = signal<string>('');

  readonly inputControl = new FormControl('');

  private readonly inputValue = toSignal(this.inputControl.valueChanges, { initialValue: '' });

  readonly canSend = computed(() => {
    return !!this.inputValue() && !this.isLoading();
  });

  toggle(): void {
    this.isOpen.update((v) => !v);
  }

  async sendMessage(): Promise<void> {
    const prompt = this.inputControl.value?.trim();
    if (!prompt || this.isLoading()) {
      return;
    }

    this.messages.update((msgs) => [...msgs, { role: 'user', content: prompt }]);
    this.inputControl.setValue('');
    this.isLoading.set(true);

    try {
      const response = await this.financeAiService.sendPrompt(prompt, this.sessionId());
      console.log(response.sessionId);
      if (this.sessionId().length === 0) {
        this.sessionId.set(response.sessionId);
      }

      this.messages.update((msgs) => [...msgs, { role: 'assistant', content: response.text }]);
    } catch (error) {
      console.error('Finance AI error:', error);
      this.messages.update((msgs) => [
        ...msgs,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
