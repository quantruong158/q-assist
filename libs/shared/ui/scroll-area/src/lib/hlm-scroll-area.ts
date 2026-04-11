import { Directive } from '@angular/core';
import { classes } from '@spartan-ng/helm/utils';

@Directive({
  selector: 'ng-scrollbar[hlm],ng-scrollbar[hlmScrollbar]',
  host: {
    'data-slot': 'scroll-area',
    '[style.--scrollbar-thumb-color]': '"rgba(136, 136, 136, 0.4)"',
    '[style.--scrollbar-thumb-hover-color]': '"rgba(136, 136, 136, 0.5)"',
    '[style.--scrollbar-container-color]': '"transparent"',
    '[style.--scrollbar-track-color]': '"transparent"',
    '[style.--scrollbar-track-thickness]': '"5px"',
    '[style.--scrollbar-track-hover-thickness]': '"6px"',
    '[style.--scrollbar-track-shape]': '"6px"',
  },
})
export class HlmScrollArea {
  constructor() {
    classes(() => 'block');
  }
}
