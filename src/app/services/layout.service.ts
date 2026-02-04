import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MatDrawerMode } from '@angular/material/sidenav';

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly sidenavOpened = signal(true);
  readonly isMobile = signal(false);
  readonly sidenavMode = computed<MatDrawerMode>(() => (this.isMobile() ? 'over' : 'side'));

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
