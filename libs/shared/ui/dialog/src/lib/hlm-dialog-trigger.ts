import { computed, Directive, inject } from '@angular/core';
import { BrnDialogTrigger } from '@spartan-ng/brain/dialog';

@Directive({
  selector: 'button[hlmDialogTrigger],button[hlmDialogTriggerFor]',
  hostDirectives: [
    {
      directive: BrnDialogTrigger,
      inputs: ['id', 'brnDialogTriggerFor: hlmDialogTriggerFor', 'type'],
    },
  ],
  host: {
    'data-slot': 'dialog-trigger',
    '[attr.data-state]': 'state()',
  },
})
export class HlmDialogTrigger {
  private readonly _trigger = inject(BrnDialogTrigger);

  protected readonly state = computed(() => this._trigger.state());
}
