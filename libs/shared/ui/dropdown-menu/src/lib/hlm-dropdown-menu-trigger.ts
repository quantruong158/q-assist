import { CdkMenuTrigger } from '@angular/cdk/menu';
import { computed, Directive, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  createMenuPosition,
  type MenuAlign,
  type MenuSide,
  waitForElementAnimations,
} from '@spartan-ng/brain/core';
import { injectHlmDropdownMenuConfig } from './hlm-dropdown-menu-token';

@Directive({
  selector: '[hlmDropdownMenuTrigger]',
  hostDirectives: [
    {
      directive: CdkMenuTrigger,
      inputs: [
        'cdkMenuTriggerFor: hlmDropdownMenuTrigger',
        'cdkMenuTriggerData: hlmDropdownMenuTriggerData',
      ],
      outputs: ['cdkMenuOpened: hlmDropdownMenuOpened', 'cdkMenuClosed: hlmDropdownMenuClosed'],
    },
  ],
  host: {
    'data-slot': 'dropdown-menu-trigger',
    '[attr.data-state]': 'state()',
  },
})
export class HlmDropdownMenuTrigger {
  private readonly _cdkTrigger = inject(CdkMenuTrigger, { host: true });
  private readonly _config = injectHlmDropdownMenuConfig();
  private readonly _patchedOverlayRefs = new WeakSet<object>();
  protected readonly state = signal<'open' | 'closed'>('closed');

  public readonly align = input<MenuAlign>(this._config.align);
  public readonly side = input<MenuSide>(this._config.side);

  private readonly _menuPosition = computed(() => createMenuPosition(this.align(), this.side()));

  constructor() {
    this._cdkTrigger.opened.pipe(takeUntilDestroyed()).subscribe(() => this.state.set('open'));
    this._cdkTrigger.closed.pipe(takeUntilDestroyed()).subscribe(() => this.state.set('closed'));

    // once the trigger opens we wait until the next tick and then grab the last position
    // used to position the menu. we store this in our trigger which the brnMenu directive has
    // access to through DI
    this._cdkTrigger.opened.pipe(takeUntilDestroyed()).subscribe(() =>
      setTimeout(() => {
        // eslint-disable-next-line
        const overlayRef = (this._cdkTrigger as any).overlayRef;
        // eslint-disable-next-line
        (this._cdkTrigger as any)._spartanLastPosition = overlayRef._positionStrategy._lastPosition;
        this.patchOverlayDetach(overlayRef);
      }),
    );

    effect(() => {
      this._cdkTrigger.menuPosition = this._menuPosition();
    });
  }

  private patchOverlayDetach(overlayRef: any) {
    if (!overlayRef || this._patchedOverlayRefs.has(overlayRef)) {
      return;
    }

    this._patchedOverlayRefs.add(overlayRef);
    const originalDetach = overlayRef.detach.bind(overlayRef);
    let detachQueued = false;

    overlayRef.detach = () => {
      if (detachQueued) {
        return true;
      }

      detachQueued = true;
      void this.detachAfterAnimations(overlayRef, originalDetach, () => {
        detachQueued = false;
      });
      return true;
    };
  }

  private async detachAfterAnimations(
    overlayRef: any,
    originalDetach: () => boolean,
    onFinish: () => void,
  ): Promise<void> {
    try {
      await waitForElementAnimations(overlayRef.overlayElement);
    } finally {
      try {
        if (overlayRef.hasAttached()) {
          originalDetach();
          // eslint-disable-next-line
          (this._cdkTrigger as any)._changeDetectorRef.markForCheck();
        }
      } finally {
        onFinish();
      }
    }
  }
}
