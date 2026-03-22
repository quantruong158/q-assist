import { Directive } from '@angular/core';
import { QTooltip } from './q-tooltip';

@Directive({
  selector: '[hlmTooltip]',
  exportAs: 'hlmTooltip',
  hostDirectives: [
    {
      directive: QTooltip,
      inputs: ['qTooltip: hlmTooltip', 'position', 'hideDelay', 'showDelay', 'tooltipDisabled'],
    },
  ],
})
export class HlmTooltip {}
