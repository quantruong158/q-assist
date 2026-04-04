import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MessageError } from '@qos/opencode/data-access';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';

@Component({
  selector: 'opencode-message-error',
  imports: [HlmSeparatorImports],
  template: ` <div class="flex items-center gap-3 my-5 text-xs text-muted-foreground">
    <hlm-separator class="flex-1" />
    @switch (error().name) {
      @case ('MessageAbortedError') {
        <span>Interrupted</span>
      }
      @case ('ProviderAuthError') {
        <span>Auth provider returned an error</span>
      }
      @case ('MessageOutputLengthError') {
        <span>Output length exceeded</span>
      }
      @case ('APIError') {
        <span>API error</span>
      }
      @default {
        <span>Unknown error</span>
      }
    }
    <hlm-separator class="flex-1" />
  </div>`,
  host: {
    class: 'w-full',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeMessageErrorComponent {
  readonly error = input.required<MessageError>();
}
