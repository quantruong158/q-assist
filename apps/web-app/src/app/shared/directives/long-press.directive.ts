import { Directive, output, OnDestroy } from '@angular/core';

@Directive({
  selector: '[appLongPress]',
  standalone: true,
  host: {
    '(mousedown)': 'onMouseDown($event)',
    '(touchstart)': 'onMouseDown($event)',
    '(mouseup)': 'onMouseUp()',
    '(mouseleave)': 'onMouseUp()',
    '(touchend)': 'onMouseUp()',
    '(touchcancel)': 'onMouseUp()',
    '(touchmove)': 'onMouseUp()',
    '(contextmenu)': 'onContextMenu($event)',
  },
})
export class LongPressDirective implements OnDestroy {
  readonly longPress = output<void>();
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly thresholdInMiliseconds = 500;

  onMouseDown(event: Event): void {
    if (event instanceof MouseEvent && event.button !== 0) return;

    this.timeoutId = setTimeout(() => {
      this.longPress.emit();
    }, this.thresholdInMiliseconds);
  }

  onMouseUp(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  onContextMenu(event: Event): void {
    event.preventDefault();
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}
