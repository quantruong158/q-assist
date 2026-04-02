import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { StepFinishPart, StepStartPart } from '../opencode.types';

@Component({
  selector: 'opencode-step-part',
  imports: [],
  template: `
    @if (isStepStart()) {
      <p class="text-xs text-muted-foreground">
        Step started {{ snapshot() ? '— snapshot taken' : '' }}
      </p>
    } @else {
      <p class="text-xs text-muted-foreground">Step finished — {{ reason() }}</p>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeStepPartComponent {
  readonly part = input.required<StepStartPart | StepFinishPart>();

  isStepStart(): boolean {
    return this.part().type === 'step-start';
  }

  snapshot(): boolean {
    return this.part().type === 'step-start' ? !!this.part().snapshot : false;
  }

  reason(): string {
    const p = this.part();
    return p.type === 'step-finish' ? p.reason : '';
  }
}
