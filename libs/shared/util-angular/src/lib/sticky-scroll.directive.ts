import { CdkScrollable } from '@angular/cdk/scrolling';
import { DestroyRef, Directive, inject, input } from '@angular/core';
import { debounceTime, map } from 'rxjs';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CdkObserveContent } from '@angular/cdk/observers';

const DEFAULT_BOTTOM_OFFSET = 0;

@Directive({
  selector: '[qStickyScroll]',
  exportAs: 'qStickyScroll',
  hostDirectives: [CdkScrollable, CdkObserveContent],
})
export class StickyScrollDirective {
  readonly following = input(false);
  readonly bottomOffset = input(DEFAULT_BOTTOM_OFFSET);
  private readonly destroyRef = inject(DestroyRef);

  private readonly scrollContainer = inject(CdkScrollable, { host: true });
  private readonly observeContent = inject(CdkObserveContent, { host: true });

  readonly isAtBottom = toSignal(
    this.scrollContainer.elementScrolled().pipe(
      debounceTime(24),
      map(() => {
        return this.scrollContainer.measureScrollOffset('bottom') <= this.bottomOffset();
      }),
    ),
    { initialValue: false },
  );

  readonly isScrollable = toSignal(
    this.scrollContainer.elementScrolled().pipe(
      debounceTime(24),
      map(() => {
        const instance = this.scrollContainer;
        const element = instance.getElementRef().nativeElement;
        return element.scrollHeight > element.clientHeight;
      }),
    ),
    { initialValue: false },
  );

  constructor() {
    takeUntilDestroyed(this.destroyRef);

    this.observeContent.event.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.following()) {
        this.scrollToBottom();
      }
    });
  }

  scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.scrollContainer.scrollTo({ bottom: 0 });
    });
  }
}
