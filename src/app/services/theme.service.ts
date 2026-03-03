import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'theme-preference';
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
    if (!this.isBrowser) return;

    this.isDarkMode.update((value) => !value);
    this.applyTheme(this.isDarkMode());
    this.savePreference(this.isDarkMode());
  }

  private initializeTheme(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);

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
    if (typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    mediaQuery.addEventListener('change', (e) => {
      if (localStorage.getItem(this.STORAGE_KEY) === null) {
        this.isDarkMode.set(e.matches);
        this.applyTheme(e.matches);
      }
    });
  }

  private applyTheme(isDark: boolean): void {
    document.documentElement.classList.toggle('dark', isDark);
  }

  private savePreference(isDark: boolean): void {
    localStorage.setItem(this.STORAGE_KEY, isDark ? 'dark' : 'light');
  }

  clearPreference(): void {
    if (!this.isBrowser) return;

    localStorage.removeItem(this.STORAGE_KEY);
    this.initializeTheme();
  }
}
