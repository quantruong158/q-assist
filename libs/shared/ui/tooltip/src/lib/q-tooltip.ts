import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  InjectionToken,
  numberAttribute,
  output,
  type Provider,
  signal,
} from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';
import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BrnDialogTrigger } from '@spartan-ng/brain/dialog';
import { hlm } from '@spartan-ng/helm/utils';
import { cva } from 'class-variance-authority';

export type QTooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface QTooltipDefaultOptions {
  position: QTooltipPosition;
  showDelay: number;
  hideDelay: number;
}

export const Q_TOOLTIP_DEFAULT_OPTIONS = new InjectionToken<Partial<QTooltipDefaultOptions>>(
  'Q_TOOLTIP_DEFAULT_OPTIONS',
);

export function provideQTooltipDefaultOptions(options: Partial<QTooltipDefaultOptions>) {
  return [{ provide: Q_TOOLTIP_DEFAULT_OPTIONS, useValue: options }] satisfies Provider[];
}

export const DEFAULT_TOOLTIP_SVG_CLASS = 'bg-foreground block size-2.5';

export const DEFAULT_TOOLTIP_CONTENT_CLASSES =
  'q-tooltip-panel pointer-events-auto relative z-50 w-fit select-text rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md text-balance';

export const tooltipPositionVariants = cva('absolute', {
  variants: {
    position: {
      top: 'bottom-0 left-1/2 translate-x-[-50%] translate-y-1/2 [clip-path:polygon(50%_100%,0_0,100%_0)]',
      bottom:
        'top-0 left-1/2 translate-x-[-50%] translate-y-[-50%] [clip-path:polygon(50%_0,0_100%,100%_100%)]',
      left: 'right-0 top-1/2 translate-x-1/2 translate-y-[-50%] [clip-path:polygon(100%_50%,0_0,0_100%)]',
      right:
        'left-0 top-1/2 translate-x-[-50%] translate-y-[-50%] [clip-path:polygon(0_50%,100%_0,100%_100%)]',
    },
  },
});

const TOOLTIP_ENTER_CLASS = 'q-tooltip-enter';
const TOOLTIP_LEAVE_CLASS = 'q-tooltip-leave';
const TOOLTIP_LEAVE_FALLBACK_MS = 120;

interface TooltipMotion {
  enterX: string;
  enterY: string;
  leaveX: string;
  leaveY: string;
  transformOrigin: string;
}

function motionForPosition(position: QTooltipPosition): TooltipMotion {
  switch (position) {
    case 'bottom':
      return {
        enterX: '0px',
        enterY: '-8px',
        leaveX: '0px',
        leaveY: '-4px',
        transformOrigin: 'center top',
      };
    case 'left':
      return {
        enterX: '8px',
        enterY: '0px',
        leaveX: '4px',
        leaveY: '0px',
        transformOrigin: 'right center',
      };
    case 'right':
      return {
        enterX: '-8px',
        enterY: '0px',
        leaveX: '-4px',
        leaveY: '0px',
        transformOrigin: 'left center',
      };
    case 'top':
    default:
      return {
        enterX: '0px',
        enterY: '8px',
        leaveX: '0px',
        leaveY: '4px',
        transformOrigin: 'center bottom',
      };
  }
}

function positionForConnectionPair(position: ConnectedPosition): QTooltipPosition {
  if (position.originY === 'top' && position.overlayY === 'bottom') {
    return 'top';
  }

  if (position.originY === 'bottom' && position.overlayY === 'top') {
    return 'bottom';
  }

  if (position.originX === 'start' && position.overlayX === 'end') {
    return 'left';
  }

  return 'right';
}

function connectedPositionsFor(position: QTooltipPosition): ConnectedPosition[] {
  const top: ConnectedPosition = {
    originX: 'center',
    originY: 'top',
    overlayX: 'center',
    overlayY: 'bottom',
    offsetY: -8,
  };
  const bottom: ConnectedPosition = {
    originX: 'center',
    originY: 'bottom',
    overlayX: 'center',
    overlayY: 'top',
    offsetY: 8,
  };
  const left: ConnectedPosition = {
    originX: 'start',
    originY: 'center',
    overlayX: 'end',
    overlayY: 'center',
    offsetX: -8,
  };
  const right: ConnectedPosition = {
    originX: 'end',
    originY: 'center',
    overlayX: 'start',
    overlayY: 'center',
    offsetX: 8,
  };

  switch (position) {
    case 'bottom':
      return [bottom, top, right, left];
    case 'left':
      return [left, right, top, bottom];
    case 'right':
      return [right, left, top, bottom];
    case 'top':
    default:
      return [top, bottom, right, left];
  }
}

function arrowClassForPosition(position: QTooltipPosition): string {
  return hlm(DEFAULT_TOOLTIP_SVG_CLASS, tooltipPositionVariants({ position }));
}

@Component({
  selector: 'q-tooltip-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div
        [attr.id]="id()"
        role="tooltip"
        [attr.data-side]="position()"
        [class]="panelClasses()"
        [style.--q-tooltip-enter-x]="motion().enterX"
        [style.--q-tooltip-enter-y]="motion().enterY"
        [style.--q-tooltip-leave-x]="motion().leaveX"
        [style.--q-tooltip-leave-y]="motion().leaveY"
        [style.transform-origin]="motion().transformOrigin"
        [animate.enter]="enterClass"
        [animate.leave]="leaveClass"
        (mouseenter)="entered.emit()"
        (mouseleave)="left.emit($event)"
        (animationend)="onAnimationEnd($event)"
      >
        <span [class]="arrowClasses()" aria-hidden="true"></span>
        <span class="relative z-10">{{ content() }}</span>
      </div>
    }
  `,
  styles: `
    :host {
      display: contents;
    }

    .q-tooltip-panel {
      will-change: transform, opacity, filter;
    }

    .q-tooltip-enter {
      animation: q-tooltip-enter 120ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .q-tooltip-leave {
      animation: q-tooltip-leave 100ms cubic-bezier(0.4, 0, 0.6, 1) both;
    }

    @keyframes q-tooltip-enter {
      from {
        opacity: 0;
        transform: translate3d(var(--q-tooltip-enter-x), var(--q-tooltip-enter-y), 0) scale(0.96);
      }

      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    @keyframes q-tooltip-leave {
      from {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }

      to {
        opacity: 0;
        transform: translate3d(var(--q-tooltip-leave-x), var(--q-tooltip-leave-y), 0) scale(0.97);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .q-tooltip-enter,
      .q-tooltip-leave {
        animation-duration: 1ms;
      }
    }
  `,
})
export class QTooltipPanelComponent {
  private readonly _closing = signal(false);

  public readonly visible = signal(false);
  public readonly id = signal('');
  public readonly content = signal('');
  public readonly position = signal<QTooltipPosition>('top');
  public readonly motion = signal<TooltipMotion>(motionForPosition('top'));
  public readonly panelClasses = signal(DEFAULT_TOOLTIP_CONTENT_CLASSES);
  public readonly arrowClasses = signal(arrowClassForPosition('top'));

  public readonly enterClass = TOOLTIP_ENTER_CLASS;
  public readonly leaveClass = TOOLTIP_LEAVE_CLASS;

  public readonly entered = output<void>();
  public readonly left = output<MouseEvent>();
  public readonly closed = output<void>();

  public open(): void {
    this._closing.set(false);
    this.visible.set(true);
  }

  public beginClose(): void {
    this._closing.set(true);
    this.visible.set(false);
  }

  public setId(id: string): void {
    this.id.set(id);
  }

  public setContent(content: string): void {
    this.content.set(content);
  }

  public setPosition(position: QTooltipPosition): void {
    this.position.set(position);
    this.motion.set(motionForPosition(position));
    this.arrowClasses.set(arrowClassForPosition(position));
  }

  public setPanelClasses(classes: string): void {
    this.panelClasses.set(classes);
  }

  public onAnimationEnd(event: AnimationEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (!this._closing() || event.animationName !== TOOLTIP_LEAVE_CLASS) {
      return;
    }

    this._closing.set(false);
    this.closed.emit();
  }
}

@Directive({
  selector: '[qTooltip]',
  exportAs: 'qTooltip',
  host: {
    'data-slot': 'tooltip-trigger',
    '[attr.aria-describedby]': 'ariaDescribedBy()',
    '(mouseenter)': 'onTriggerEnter()',
    '(mouseleave)': 'onTriggerLeave()',
    '(pointerdown)': 'onTriggerActivate()',
    '(click)': 'onTriggerActivate()',
    '(keydown.enter)': 'onTriggerActivate()',
    '(keydown.space)': 'onTriggerActivate()',
    '(keydown.escape)': 'hide(true)',
  },
})
export class QTooltip {
  private readonly _host = inject(ElementRef<HTMLElement>);
  private readonly _focusMonitor = inject(FocusMonitor);
  private readonly _overlay = inject(Overlay);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _dialogTrigger = inject(BrnDialogTrigger, { optional: true, host: true });
  private readonly _defaults = inject(Q_TOOLTIP_DEFAULT_OPTIONS, { optional: true });

  private _overlayRef: OverlayRef | null = null;
  private _panelRef: ComponentRef<QTooltipPanelComponent> | null = null;
  private _closeFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private _showTimer: ReturnType<typeof setTimeout> | null = null;
  private _hideTimer: ReturnType<typeof setTimeout> | null = null;
  private _panelClosedSubscription: { unsubscribe(): void } | null = null;
  private _panelEnteredSubscription: { unsubscribe(): void } | null = null;
  private _panelLeftSubscription: { unsubscribe(): void } | null = null;
  private _positionSubscription: { unsubscribe(): void } | null = null;

  private readonly _tooltipId = `q-tooltip-${++qTooltipId}`;
  private readonly _mounted = signal(false);
  private readonly _hoverBridgeDelay = 100;
  private _triggerHovered = false;
  private _panelHovered = false;
  private readonly _dialogTriggerOpen = computed(() => this._dialogTrigger?.state() === 'open');

  public readonly qTooltip = input('', { alias: 'qTooltip' });
  public readonly position = input<QTooltipPosition>(this._defaults?.position ?? 'top');
  public readonly showDelay = input(this._defaults?.showDelay ?? 0, {
    transform: numberAttribute,
  });
  public readonly hideDelay = input(this._defaults?.hideDelay ?? 200, {
    transform: numberAttribute,
  });
  public readonly tooltipDisabled = input(false, { transform: booleanAttribute });
  public readonly mutableTooltipDisabled = signal(false);

  public readonly ariaDescribedBy = computed(() =>
    this._mounted() && this._isEnabled() ? this._tooltipId : null,
  );

  constructor() {
    effect(() => {
      if (!this._isEnabled()) {
        this.hide(true);
      }
    });

    effect(() => {
      if (this._dialogTriggerOpen()) {
        this.hide(true);
      }
    });

    this._focusMonitor
      .monitor(this._host, false)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((origin) => {
        if (origin === 'keyboard') {
          this.show();
          return;
        }

        if (origin === null) {
          this._scheduleHide();
        }
      });

    effect(() => {
      const content = this.qTooltip();
      const position = this.position();

      if (!this._panelRef) {
        return;
      }

      const panel = this._panelRef.instance;
      panel.setId(this._tooltipId);
      panel.setContent(content);
      panel.setPosition(position);
      panel.setPanelClasses(DEFAULT_TOOLTIP_CONTENT_CLASSES);
    });

    this._destroyRef.onDestroy(() => {
      this._clearTimers();
      this._panelClosedSubscription?.unsubscribe();
      this._panelEnteredSubscription?.unsubscribe();
      this._panelLeftSubscription?.unsubscribe();
      this._focusMonitor.stopMonitoring(this._host);
      this._overlayRef?.dispose();
      this._overlayRef = null;
      this._panelRef = null;
      this._mounted.set(false);
    });
  }

  public onTriggerEnter(): void {
    this._triggerHovered = true;
    this.show();
  }

  public onTriggerLeave(): void {
    this._triggerHovered = false;
    this._scheduleHide();
  }

  public onTriggerActivate(): void {
    this.hide(true);
  }

  public show(): void {
    this._clearHideTimer();

    if (!this._isEnabled() || !this.qTooltip().trim()) {
      return;
    }

    if (this._mounted()) {
      this._clearCloseFallback();
      this._panelRef?.instance.open();
      return;
    }

    if (this._showTimer) {
      return;
    }

    const delay = Math.max(0, this.showDelay());
    if (delay === 0) {
      this._showNow();
      return;
    }

    this._showTimer = setTimeout(() => {
      this._showTimer = null;
      this._showNow();
    }, delay);
  }

  public hide(immediate = false): void {
    this._triggerHovered = false;
    this._clearShowTimer();

    if (!this._mounted()) {
      this._clearHideTimer();
      this._clearCloseFallback();
      return;
    }

    if (immediate) {
      this._resetInteractionState();
      this._hideNow(true);
      return;
    }

    if (this.hideDelay() === 0) {
      this._hideNow(false);
      return;
    }

    if (this._hideTimer) {
      return;
    }

    this._hideTimer = setTimeout(() => {
      this._hideTimer = null;
      this._hideNow(false);
    }, this.hideDelay());
  }

  private _showNow(): void {
    if (!this._isEnabled() || !this.qTooltip().trim()) {
      return;
    }

    this._ensureOverlay();

    if (!this._overlayRef) {
      return;
    }

    if (!this._panelRef) {
      this._attachPanel();
    }

    const panel = this._panelRef?.instance;
    if (!panel) {
      return;
    }

    panel.setId(this._tooltipId);
    panel.setContent(this.qTooltip());
    panel.setPosition(this.position());
    panel.setPanelClasses(DEFAULT_TOOLTIP_CONTENT_CLASSES);
    panel.open();
    this._mounted.set(true);
    this._overlayRef.updatePosition();
  }

  private _hideNow(immediate: boolean): void {
    this._clearHideTimer();
    this._clearShowTimer();

    if (!this._overlayRef || !this._panelRef) {
      this._resetInteractionState();
      this._mounted.set(false);
      return;
    }

    if (immediate) {
      this._resetInteractionState();
      this._mounted.set(false);
      this._panelClosedSubscription?.unsubscribe();
      this._panelClosedSubscription = null;
      this._panelEnteredSubscription?.unsubscribe();
      this._panelEnteredSubscription = null;
      this._panelLeftSubscription?.unsubscribe();
      this._panelLeftSubscription = null;
      this._positionSubscription?.unsubscribe();
      this._positionSubscription = null;
      this._overlayRef.detach();
      this._overlayRef.dispose();
      this._overlayRef = null;
      this._panelRef = null;
      return;
    }

    this._clearCloseFallback();
    this._panelRef.instance.beginClose();
    this._closeFallbackTimer = setTimeout(() => {
      this._closeFallbackTimer = null;
      this._finalizeHide();
    }, TOOLTIP_LEAVE_FALLBACK_MS);
  }

  private _finalizeHide(): void {
    this._clearCloseFallback();
    this._resetInteractionState();
    this._mounted.set(false);
    this._panelClosedSubscription?.unsubscribe();
    this._panelClosedSubscription = null;
    this._panelEnteredSubscription?.unsubscribe();
    this._panelEnteredSubscription = null;
    this._panelLeftSubscription?.unsubscribe();
    this._panelLeftSubscription = null;
    this._positionSubscription?.unsubscribe();
    this._positionSubscription = null;
    this._overlayRef?.detach();
    this._overlayRef?.dispose();
    this._overlayRef = null;
    this._panelRef = null;
  }

  private _ensureOverlay(): void {
    if (this._overlayRef) {
      return;
    }

    const positionStrategy = this._overlay
      .position()
      .flexibleConnectedTo(this._host)
      .withFlexibleDimensions(false)
      .withPush(true)
      .withViewportMargin(8)
      .withPositions(connectedPositionsFor(this.position()))
      .withTransformOriginOn('.q-tooltip-panel');

    this._overlayRef = this._overlay.create({
      positionStrategy,
      scrollStrategy: this._overlay.scrollStrategies.reposition(),
    });

    this._positionSubscription?.unsubscribe();
    this._positionSubscription = positionStrategy.positionChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((event) => {
        if (!this._panelRef) {
          return;
        }

        this._panelRef.instance.setPosition(positionForConnectionPair(event.connectionPair));
      });
  }

  private _attachPanel(): void {
    if (!this._overlayRef) {
      return;
    }

    this._panelClosedSubscription?.unsubscribe();
    this._panelClosedSubscription = null;
    this._panelEnteredSubscription?.unsubscribe();
    this._panelEnteredSubscription = null;
    this._panelLeftSubscription?.unsubscribe();
    this._panelLeftSubscription = null;

    this._panelRef = this._overlayRef.attach(new ComponentPortal(QTooltipPanelComponent));
    this._panelClosedSubscription = this._panelRef.instance.closed.subscribe(() => {
      this._finalizeHide();
    });
    this._panelEnteredSubscription = this._panelRef.instance.entered.subscribe(() => {
      this._panelHovered = true;
      this._clearHideTimer();
    });
    this._panelLeftSubscription = this._panelRef.instance.left.subscribe(() => {
      this._panelHovered = false;
      this._scheduleHide();
    });
  }

  private _scheduleHide(): void {
    this._clearHideTimer();

    if (!this._mounted()) {
      this._clearShowTimer();
      return;
    }

    if (this._triggerHovered || this._panelHovered) {
      return;
    }

    const delay = Math.max(this.hideDelay(), this._hoverBridgeDelay);
    if (delay === 0) {
      this._hideNow(false);
      return;
    }

    this._hideTimer = setTimeout(() => {
      this._hideTimer = null;
      if (!this._triggerHovered && !this._panelHovered) {
        this._hideNow(false);
      }
    }, delay);
  }

  private _resetInteractionState(): void {
    this._triggerHovered = false;
    this._panelHovered = false;
  }

  private _isEnabled(): boolean {
    return (
      !this.tooltipDisabled() &&
      !this.mutableTooltipDisabled() &&
      !this._dialogTriggerOpen() &&
      this.qTooltip().trim().length > 0
    );
  }

  private _clearTimers(): void {
    this._clearShowTimer();
    this._clearHideTimer();
    this._clearCloseFallback();
    this._panelClosedSubscription?.unsubscribe();
    this._panelClosedSubscription = null;
    this._panelEnteredSubscription?.unsubscribe();
    this._panelEnteredSubscription = null;
    this._panelLeftSubscription?.unsubscribe();
    this._panelLeftSubscription = null;
    this._positionSubscription?.unsubscribe();
    this._positionSubscription = null;
  }

  private _clearShowTimer(): void {
    if (this._showTimer) {
      clearTimeout(this._showTimer);
      this._showTimer = null;
    }
  }

  private _clearHideTimer(): void {
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
  }

  private _clearCloseFallback(): void {
    if (this._closeFallbackTimer) {
      clearTimeout(this._closeFallbackTimer);
      this._closeFallbackTimer = null;
    }
  }
}

let qTooltipId = 0;
