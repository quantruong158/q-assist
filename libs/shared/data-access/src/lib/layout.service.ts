import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly sidenavOpened = signal(true);
  readonly isMobile = signal(false);

  constructor() {
    this.breakpointObserver
      .observe(['(max-width: 768px)'])
      .pipe(takeUntilDestroyed())
      .subscribe((result) => {
        this.isMobile.set(result.matches);
        if (result.matches) {
          this.sidenavOpened.set(false);
        }
      });
  }

  toggleSidenav(): void {
    this.sidenavOpened.update((opened) => !opened);
  }

  setSidenav(isOpen: boolean): void {
    this.sidenavOpened.set(isOpen);
  }
}
