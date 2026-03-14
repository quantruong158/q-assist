import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'theme-preference';
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isDarkMode = signal(false);

  constructor() {
    if (this.isBrowser) {
      this.initializeTheme();
      this.setupSystemPreferenceListener();
    }
  }

  toggleTheme(): void {
    if (!this.isBrowser) {
      return;
    }

    this.isDarkMode.update((value) => !value);
    this.applyTheme(this.isDarkMode());
    this.savePreference(this.isDarkMode());
  }

  clearPreference(): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.removeItem(this.storageKey);
    this.initializeTheme();
  }

  private initializeTheme(): void {
    const stored = localStorage.getItem(this.storageKey);

    let prefersDark = false;
    if (stored !== null) {
      prefersDark = stored === 'dark';
    } else if (typeof window.matchMedia === 'function') {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    this.isDarkMode.set(prefersDark);
    this.applyTheme(prefersDark);
  }

  private setupSystemPreferenceListener(): void {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (e) => {
      if (localStorage.getItem(this.storageKey) === null) {
        this.isDarkMode.set(e.matches);
        this.applyTheme(e.matches);
      }
    });
  }

  private applyTheme(isDark: boolean): void {
    document.documentElement.classList.toggle('dark', isDark);
  }

  private savePreference(isDark: boolean): void {
    localStorage.setItem(this.storageKey, isDark ? 'dark' : 'light');
  }
}
