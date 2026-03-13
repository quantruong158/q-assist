import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Auth, User, user as userObservable, browserLocalPersistence } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(Auth);
  private readonly platformId = inject(PLATFORM_ID);
  user$ = userObservable(this.auth);

  private readonly userSignal = signal<User | null>(null);
  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoading = signal(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.user$.subscribe((user) => {
        this.userSignal.set(user);
      });
    }

    this.auth.setPersistence(browserLocalPersistence).then(() => {
      this.isLoading.set(false);
    });
    this.user$ = userObservable(this.auth);
  }
}
