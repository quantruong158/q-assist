import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  inject,
  isDevMode,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideFirebaseApp, initializeApp, getApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import {
  provideFirestore,
  connectFirestoreEmulator,
  initializeFirestore,
} from '@angular/fire/firestore';
import { provideMarkdown } from 'ngx-markdown';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { authInterceptor } from '@qos/shared/auth/util';
import { provideNgIconsConfig } from '@ng-icons/core';
import { connectFunctionsEmulator, getFunctions, provideFunctions } from '@angular/fire/functions';
import { connectStorageEmulator, getStorage, provideStorage } from '@angular/fire/storage';
import { RouteReuseStrategy } from '@angular/router';
import { CustomRouteReuseStrategy } from './custom-route-reuse';
import { ThemeService } from '@qos/shared/data-access';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: RouteReuseStrategy, useClass: CustomRouteReuseStrategy },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),

    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => {
      const auth = getAuth();

      if (isDevMode()) {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      }

      return auth;
    }),
    provideFunctions(() => {
      const functions = getFunctions();

      if (isDevMode()) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }

      return functions;
    }),
    provideStorage(() => {
      const storage = getStorage();

      if (isDevMode()) {
        connectStorageEmulator(storage, 'localhost', 9199);
      }

      return storage;
    }),
    provideFirestore(() => {
      const app = getApp();
      const firestore = initializeFirestore(app, {
        ignoreUndefinedProperties: true,
      });

      if (isDevMode()) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }

      return firestore;
    }),

    provideMarkdown(),
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
    provideNgIconsConfig({
      strokeWidth: 2,
    }),
  ],
};
