import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { StepFinishPart, StepStartPart } from '@qos/opencode/data-access';
@Component({
  selector: 'opencode-step-part',
  imports: [],
  template: `@if (isStepStart()) {
      <p class="text-xs text-muted-foreground">
        Step started {{ snapshot() ? '— snapshot taken' : '' }}
      </p>
    } @else {
      <p class="text-xs text-muted-foreground">Step finished — {{ reason() }}</p>
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpencodeStepPartComponent {
  readonly part = input.required<StepStartPart | StepFinishPart>();

  protected readonly isStepStart = computed(() => this.part().type === 'step-start');
  protected readonly snapshot = computed(() =>
    this.part().type === 'step-start' ? !!this.part().snapshot : false,
  );
  protected readonly reason = computed(() => {
    const p = this.part();
    return p.type === 'step-finish' ? p.reason : '';
  });
}
