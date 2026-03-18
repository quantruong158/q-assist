import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'chat-intent-card',
  imports: [HlmButtonImports],
  template: ` <button
    hlmBtn
    variant="outline"
    class="rounded-full font-normal px-3 py-4"
    (click)="selected.emit(text())"
  >
    {{ text() }}
  </button>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatIntentCard {
  readonly text = input.required<string>();
  readonly selected = output<string>();
}
